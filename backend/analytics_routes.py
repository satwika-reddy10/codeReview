# analytics_routes.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db, AISuggestion, AcceptedSuggestion, RejectedSuggestion, ModifiedSuggestion, SuggestionLatency, CodeSession, UserPattern
from schemas import AnalyticsFilter

def build_query(db_model, filter: AnalyticsFilter, db: Session):
    query = db.query(db_model)
    if filter.user_id is not None:
        query = query.join(CodeSession, CodeSession.session_id == db_model.session_id).filter(CodeSession.user_id == filter.user_id)
    if filter.language:
        query = query.filter(db_model.language == filter.language)
    if filter.start_date:
        try:
            start_dt = datetime.strptime(filter.start_date, '%Y-%m-%d')
            query = query.filter(db_model.created_at >= start_dt)
        except ValueError:
            pass  # Ignore invalid date
    if filter.end_date:
        try:
            end_dt = datetime.strptime(filter.end_date, '%Y-%m-%d') + timedelta(days=1)
            query = query.filter(db_model.created_at < end_dt)
        except ValueError:
            pass  # Ignore invalid date
    return query

def get_suggestions_stats(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    accepted_query = build_query(AcceptedSuggestion, filter, db)
    rejected_query = build_query(RejectedSuggestion, filter, db)
    modified_query = build_query(ModifiedSuggestion, filter, db)

    accepted = accepted_query.count()
    rejected = rejected_query.count()
    modified = modified_query.count()

    total = accepted + rejected + modified
    percentages = {
        'accepted': (accepted / total * 100) if total else 0,
        'rejected': (rejected / total * 100) if total else 0,
        'modified': (modified / total * 100) if total else 0,
    }

    return {
        'accepted': accepted,
        'rejected': rejected,
        'modified': modified,
        'percentages': percentages
    }

def get_detection_accuracy(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    ai_suggestion_query = build_query(AISuggestion, filter, db)
    accepted_query = build_query(AcceptedSuggestion, filter, db)
    modified_query = build_query(ModifiedSuggestion, filter, db)

    total_suggestions = ai_suggestion_query.count()
    accepted = accepted_query.count()
    modified = modified_query.count()

    relevant_suggestions = accepted + modified
    accuracy = (relevant_suggestions / total_suggestions * 100) if total_suggestions else 0

    return {'accuracy': accuracy}

def get_latency_stats(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    query = build_query(SuggestionLatency, filter, db)
    query = query.with_entities(
        func.date(SuggestionLatency.created_at).label('date'),
        func.avg(SuggestionLatency.latency_ms).label('latency')
    ).group_by('date').order_by('date')
    results = query.all()
    return [{'date': str(item.date), 'latency': item.latency} for item in results if item.date]

def get_learning_effectiveness(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    # Ensure user_id is provided, otherwise return empty data
    if filter.user_id is None:
        return []

    # Count user's suggestions that match their patterns
    query = build_query(AISuggestion, filter, db)
    query = query.join(UserPattern, UserPattern.session_id == AISuggestion.session_id).filter(
        UserPattern.user_id == filter.user_id,
        UserPattern.pattern_type.in_(['accepted', 'modified'])
    )
    query = query.with_entities(
        func.date(AISuggestion.created_at).label('date'),
        func.count().label('count')
    ).group_by('date').order_by('date')

    total_suggestions_query = build_query(AISuggestion, filter, db)
    total_suggestions_query = total_suggestions_query.with_entities(
        func.date(AISuggestion.created_at).label('date'),
        func.count().label('total_count')
    ).group_by('date').order_by('date')

    aligned_results = query.all()
    total_results = total_suggestions_query.all()

    # Merge results to calculate user's effectiveness
    effectiveness_data = []
    total_dict = {item.date: item.total_count for item in total_results}
    for item in aligned_results:
        total = total_dict.get(item.date, 1)  # Avoid division by zero
        effectiveness = (item.count / total * 100) if total else 0
        effectiveness_data.append({'date': str(item.date), 'effectiveness': effectiveness})

    return effectiveness_data

def get_trends(db_model, filter: AnalyticsFilter, db: Session):
    query = build_query(db_model, filter, db)
    query = query.with_entities(
        func.date(db_model.created_at).label('date'),
        func.count().label('count')
    ).group_by('date').order_by('date')
    results = query.all()
    return [{'date': str(item.date), 'count': item.count} for item in results if item.date]

def get_trends_stats(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    accepted = get_trends(AcceptedSuggestion, filter, db)
    rejected = get_trends(RejectedSuggestion, filter, db)
    modified = get_trends(ModifiedSuggestion, filter, db)

    return {
        'accepted': accepted,
        'rejected': rejected,
        'modified': modified
    }