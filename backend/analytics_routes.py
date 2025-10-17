# analytics_routes.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db, AISuggestion, AcceptedSuggestion, RejectedSuggestion, ModifiedSuggestion, SuggestionLatency, CodeSession, UserPattern, User
from schemas import AnalyticsFilter

def build_query(db_model, filter: AnalyticsFilter, db: Session):
    query = db.query(db_model)
    
    # If user_id is provided, filter by user_id through CodeSession
    if filter.user_id is not None:
        print(f"DEBUG: Building query for {db_model.__tablename__}, user_id: {filter.user_id}")
        
        # Get session IDs for this user
        user_sessions = db.query(CodeSession.session_id).filter(CodeSession.user_id == filter.user_id).all()
        session_ids = [session[0] for session in user_sessions]
        
        print(f"DEBUG: Found {len(session_ids)} sessions for user {filter.user_id}: {session_ids}")
        
        if session_ids:
            query = query.filter(db_model.session_id.in_(session_ids))
        else:
            # If no sessions found, return empty query
            query = query.filter(db_model.session_id == "non_existent_session_id")
    
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
    try:
        print(f"DEBUG: Getting suggestions stats for user_id: {filter.user_id}")
        
        # Build queries for each suggestion type
        accepted_query = build_query(AcceptedSuggestion, filter, db)
        rejected_query = build_query(RejectedSuggestion, filter, db)
        modified_query = build_query(ModifiedSuggestion, filter, db)

        # Get counts
        accepted = accepted_query.count()
        rejected = rejected_query.count()
        modified = modified_query.count()

        print(f"DEBUG: Counts - Accepted: {accepted}, Rejected: {rejected}, Modified: {modified}")

        total = accepted + rejected + modified
        percentages = {
            'accepted': (accepted / total * 100) if total else 0,
            'rejected': (rejected / total * 100) if total else 0,
            'modified': (modified / total * 100) if total else 0,
        }

        # Get per-developer stats if no user_id filter (admin view)
        developer_stats = []
        if filter.user_id is None:
            developers = db.query(User).filter(User.role == 'developer').all()
            for dev in developers:
                dev_filter = AnalyticsFilter(
                    user_id=dev.id, 
                    language=filter.language, 
                    start_date=filter.start_date, 
                    end_date=filter.end_date
                )
                dev_accepted = build_query(AcceptedSuggestion, dev_filter, db).count()
                dev_rejected = build_query(RejectedSuggestion, dev_filter, db).count()
                dev_modified = build_query(ModifiedSuggestion, dev_filter, db).count()
                
                developer_stats.append({
                    'user_id': dev.id,
                    'username': dev.username,
                    'accepted': dev_accepted,
                    'rejected': dev_rejected,
                    'modified': dev_modified
                })

        result = {
            'accepted': accepted,
            'rejected': rejected,
            'modified': modified,
            'percentages': percentages,
            'developer_stats': developer_stats
        }
        
        print(f"DEBUG: Returning result: {result}")
        return result
        
    except Exception as e:
        print(f"Error in get_suggestions_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_detection_accuracy(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    try:
        print(f"DEBUG: Getting detection accuracy for user_id: {filter.user_id}")
        
        ai_suggestion_query = build_query(AISuggestion, filter, db)
        accepted_query = build_query(AcceptedSuggestion, filter, db)
        modified_query = build_query(ModifiedSuggestion, filter, db)

        total_suggestions = ai_suggestion_query.count()
        accepted = accepted_query.count()
        modified = modified_query.count()

        print(f"DEBUG: Detection accuracy - Total: {total_suggestions}, Accepted: {accepted}, Modified: {modified}")

        relevant_suggestions = accepted + modified
        accuracy = (relevant_suggestions / total_suggestions * 100) if total_suggestions else 0

        # Get per-developer accuracy if no user_id filter (admin view)
        developer_accuracy = []
        if filter.user_id is None:
            developers = db.query(User).filter(User.role == 'developer').all()
            for dev in developers:
                dev_filter = AnalyticsFilter(
                    user_id=dev.id, 
                    language=filter.language, 
                    start_date=filter.start_date, 
                    end_date=filter.end_date
                )
                dev_total = build_query(AISuggestion, dev_filter, db).count()
                dev_accepted = build_query(AcceptedSuggestion, dev_filter, db).count()
                dev_modified = build_query(ModifiedSuggestion, dev_filter, db).count()
                dev_relevant = dev_accepted + dev_modified
                dev_accuracy = (dev_relevant / dev_total * 100) if dev_total else 0
                
                developer_accuracy.append({
                    'user_id': dev.id,
                    'username': dev.username,
                    'accuracy': dev_accuracy
                })

        result = {
            'accuracy': accuracy,
            'developer_accuracy': developer_accuracy
        }
        
        print(f"DEBUG: Returning detection accuracy: {result}")
        return result
        
    except Exception as e:
        print(f"Error in get_detection_accuracy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


def get_latency_stats(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    try:
        query = build_query(SuggestionLatency, filter, db)
        
        # If filtering by user, join with CodeSession
        if filter.user_id is not None:
            query = query.join(CodeSession, CodeSession.session_id == SuggestionLatency.session_id)
        
        query = query.with_entities(
            func.date(SuggestionLatency.created_at).label('date'),
            func.avg(SuggestionLatency.latency_ms).label('latency')
        ).group_by('date').order_by('date')
        
        results = query.all()
        
        # Get per-developer latency if no user_id filter (admin view)
        developer_latency = []
        if filter.user_id is None:
            developers = db.query(User).filter(User.role == 'developer').all()
            for dev in developers:
                dev_filter = AnalyticsFilter(
                    user_id=dev.id, 
                    language=filter.language, 
                    start_date=filter.start_date, 
                    end_date=filter.end_date
                )
                dev_query = build_query(SuggestionLatency, dev_filter, db)
                dev_query = dev_query.with_entities(
                    func.date(SuggestionLatency.created_at).label('date'),
                    func.avg(SuggestionLatency.latency_ms).label('latency')
                ).group_by('date').order_by('date')
                
                dev_results = dev_query.all()
                developer_latency.append({
                    'user_id': dev.id,
                    'username': dev.username,
                    'latency': [{'date': str(item.date), 'latency': float(item.latency or 0)} for item in dev_results if item.date]
                })
        
        return {
            'overall_latency': [{'date': str(item.date), 'latency': float(item.latency or 0)} for item in results if item.date],
            'developer_latency': developer_latency
        }
    except Exception as e:
        print(f"Error in get_latency_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_learning_effectiveness(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    try:
        # For single user
        if filter.user_id is not None:
            # Get accepted and modified suggestions count by date
            accepted_query = build_query(AcceptedSuggestion, filter, db)
            modified_query = build_query(ModifiedSuggestion, filter, db)
            
            # Combine accepted and modified counts by date
            accepted_by_date = accepted_query.with_entities(
                func.date(AcceptedSuggestion.created_at).label('date'),
                func.count().label('count')
            ).group_by('date').all()
            
            modified_by_date = modified_query.with_entities(
                func.date(ModifiedSuggestion.created_at).label('date'),
                func.count().label('count')
            ).group_by('date').all()
            
            # Get total suggestions by date
            total_suggestions_query = build_query(AISuggestion, filter, db)
            total_by_date = total_suggestions_query.with_entities(
                func.date(AISuggestion.created_at).label('date'),
                func.count().label('total_count')
            ).group_by('date').all()
            
            # Combine the data
            effectiveness_data = []
            total_dict = {item.date: item.total_count for item in total_by_date}
            
            # Create a combined dictionary for accepted + modified
            combined_dict = {}
            for item in accepted_by_date:
                combined_dict[item.date] = combined_dict.get(item.date, 0) + item.count
            for item in modified_by_date:
                combined_dict[item.date] = combined_dict.get(item.date, 0) + item.count
            
            for date, count in combined_dict.items():
                total = total_dict.get(date, 0)
                effectiveness = (count / total * 100) if total else 0
                effectiveness_data.append({
                    'date': str(date), 
                    'effectiveness': float(effectiveness)
                })
            
            # Sort by date
            effectiveness_data.sort(key=lambda x: x['date'])
            
            return {
                'effectiveness': effectiveness_data,
                'developer_effectiveness': []
            }
        
        # For all developers (admin view)
        developer_effectiveness = []
        developers = db.query(User).filter(User.role == 'developer').all()
        
        for dev in developers:
            dev_filter = AnalyticsFilter(
                user_id=dev.id, 
                language=filter.language, 
                start_date=filter.start_date, 
                end_date=filter.end_date
            )
            
            # Get accepted and modified counts for this developer
            accepted_query = build_query(AcceptedSuggestion, dev_filter, db)
            modified_query = build_query(ModifiedSuggestion, dev_filter, db)
            
            accepted_by_date = accepted_query.with_entities(
                func.date(AcceptedSuggestion.created_at).label('date'),
                func.count().label('count')
            ).group_by('date').all()
            
            modified_by_date = modified_query.with_entities(
                func.date(ModifiedSuggestion.created_at).label('date'),
                func.count().label('count')
            ).group_by('date').all()
            
            # Get total suggestions for this developer
            total_suggestions_query = build_query(AISuggestion, dev_filter, db)
            total_by_date = total_suggestions_query.with_entities(
                func.date(AISuggestion.created_at).label('date'),
                func.count().label('total_count')
            ).group_by('date').all()
            
            # Combine data
            effectiveness_data = []
            total_dict = {item.date: item.total_count for item in total_by_date}
            
            combined_dict = {}
            for item in accepted_by_date:
                combined_dict[item.date] = combined_dict.get(item.date, 0) + item.count
            for item in modified_by_date:
                combined_dict[item.date] = combined_dict.get(item.date, 0) + item.count
            
            for date, count in combined_dict.items():
                total = total_dict.get(date, 0)
                effectiveness = (count / total * 100) if total else 0
                effectiveness_data.append({
                    'date': str(date), 
                    'effectiveness': float(effectiveness)
                })
            
            # Sort by date
            effectiveness_data.sort(key=lambda x: x['date'])
            
            developer_effectiveness.append({
                'user_id': dev.id,
                'username': dev.username,
                'effectiveness': effectiveness_data
            })
        
        return {
            'effectiveness': [],
            'developer_effectiveness': developer_effectiveness
        }
        
    except Exception as e:
        print(f"Error in get_learning_effectiveness: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_trends(db_model, filter: AnalyticsFilter, db: Session):
    query = build_query(db_model, filter, db)
    query = query.with_entities(
        func.date(db_model.created_at).label('date'),
        func.count().label('count')
    ).group_by('date').order_by('date')
    
    results = query.all()
    return [{'date': str(item.date), 'count': item.count} for item in results if item.date]

def get_trends_stats(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    try:
        accepted = get_trends(AcceptedSuggestion, filter, db)
        rejected = get_trends(RejectedSuggestion, filter, db)
        modified = get_trends(ModifiedSuggestion, filter, db)

        # Get per-developer trends if no user_id filter (admin view)
        developer_trends = {'accepted': [], 'rejected': [], 'modified': []}
        if filter.user_id is None:
            developers = db.query(User).filter(User.role == 'developer').all()
            for dev in developers:
                dev_filter = AnalyticsFilter(
                    user_id=dev.id, 
                    language=filter.language, 
                    start_date=filter.start_date, 
                    end_date=filter.end_date
                )
                dev_accepted = get_trends(AcceptedSuggestion, dev_filter, db)
                dev_rejected = get_trends(RejectedSuggestion, dev_filter, db)
                dev_modified = get_trends(ModifiedSuggestion, dev_filter, db)
                
                developer_trends['accepted'].append({
                    'username': dev.username, 
                    'data': dev_accepted
                })
                developer_trends['rejected'].append({
                    'username': dev.username, 
                    'data': dev_rejected
                })
                developer_trends['modified'].append({
                    'username': dev.username, 
                    'data': dev_modified
                })

        return {
            'accepted': accepted,
            'rejected': rejected,
            'modified': modified,
            'developer_trends': developer_trends
        }
    except Exception as e:
        print(f"Error in get_trends_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_error_types(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    try:
        # Overall error types by severity
        query = build_query(AISuggestion, filter, db)
        query = query.with_entities(
            AISuggestion.severity,
            func.count().label('count')
        ).group_by(AISuggestion.severity)
        
        results = query.all()
        overall_error_types = [{
            'severity': item.severity or 'Unknown', 
            'count': item.count
        } for item in results]

        # Per-developer error types if no user_id filter (admin view)
        developer_error_types = []
        if filter.user_id is None:
            developers = db.query(User).filter(User.role == 'developer').all()
            for dev in developers:
                dev_filter = AnalyticsFilter(
                    user_id=dev.id, 
                    language=filter.language, 
                    start_date=filter.start_date, 
                    end_date=filter.end_date
                )
                dev_query = build_query(AISuggestion, dev_filter, db)
                dev_query = dev_query.with_entities(
                    AISuggestion.severity,
                    func.count().label('count')
                ).group_by(AISuggestion.severity)
                
                dev_results = dev_query.all()
                developer_error_types.append({
                    'user_id': dev.id,
                    'username': dev.username,
                    'error_types': [{
                        'severity': item.severity or 'Unknown', 
                        'count': item.count
                    } for item in dev_results]
                })

        return {
            'overall_error_types': overall_error_types,
            'developer_error_types': developer_error_types
        }
    except Exception as e:
        print(f"Error in get_error_types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_error_categories(filter: AnalyticsFilter, db: Session = Depends(get_db)):
    try:
        # Overall error categories from AISuggestion table
        query = build_query(AISuggestion, filter, db)
        query = query.with_entities(
            AISuggestion.error_category,
            func.count().label('count')
        ).group_by(AISuggestion.error_category)
        
        results = query.all()
        overall_error_categories = [{
            'category': item.error_category or 'Other Issue', 
            'count': item.count
        } for item in results]

        # Per-developer error categories if no user_id filter (admin view)
        developer_error_categories = []
        if filter.user_id is None:
            developers = db.query(User).filter(User.role == 'developer').all()
            for dev in developers:
                dev_filter = AnalyticsFilter(
                    user_id=dev.id, 
                    language=filter.language, 
                    start_date=filter.start_date, 
                    end_date=filter.end_date
                )
                dev_query = build_query(AISuggestion, dev_filter, db)
                dev_query = dev_query.with_entities(
                    AISuggestion.error_category,
                    func.count().label('count')
                ).group_by(AISuggestion.error_category)
                
                dev_results = dev_query.all()
                developer_error_categories.append({
                    'user_id': dev.id,
                    'username': dev.username,
                    'error_categories': [{
                        'category': item.error_category or 'Other Issue', 
                        'count': item.count
                    } for item in dev_results]
                })

        return {
            'overall_error_categories': overall_error_categories,
            'developer_error_categories': developer_error_categories
        }
    except Exception as e:
        print(f"Error in get_error_categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
def debug_analytics_data(db: Session = Depends(get_db)):
    """Debug endpoint to check what data exists in the database"""
    try:
        # Count records in each table
        ai_suggestions_count = db.query(AISuggestion).count()
        accepted_count = db.query(AcceptedSuggestion).count()
        rejected_count = db.query(RejectedSuggestion).count()
        modified_count = db.query(ModifiedSuggestion).count()
        code_sessions_count = db.query(CodeSession).count()
        users_count = db.query(User).count()
        
        # Get some sample data
        recent_sessions = db.query(CodeSession).limit(5).all()
        recent_users = db.query(User).limit(5).all()
        
        # Check if we have any sessions with user_id
        sessions_with_user_id = db.query(CodeSession).filter(CodeSession.user_id.isnot(None)).count()
        
        return {
            "counts": {
                "ai_suggestions": ai_suggestions_count,
                "accepted_suggestions": accepted_count,
                "rejected_suggestions": rejected_count,
                "modified_suggestions": modified_count,
                "code_sessions": code_sessions_count,
                "sessions_with_user_id": sessions_with_user_id,
                "users": users_count
            },
            "recent_sessions": [
                {
                    "id": session.id,
                    "session_id": session.session_id,
                    "user_id": session.user_id,
                    "language": session.language,
                    "created_at": session.created_at.isoformat() if session.created_at else None
                } for session in recent_sessions
            ],
            "recent_users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role,
                    "created_at": user.created_at.isoformat() if user.created_at else None
                } for user in recent_users
            ]
        }
    except Exception as e:
        return {"error": str(e)}