def validate_journey(train_number, stops):
    """
    Validates a reconstructed scheduled journey.
    Returns a list of issue dictionaries: [{'check': '...', 'description': '...'}]
    """
    issues = []
    
    if not train_number:
        issues.append({'check': 'Missing Train Number', 'description': 'Journey has no train number'})
        return issues # Can't continue checking without train info
        
    if not stops:
        issues.append({'check': 'Empty Journey', 'description': f'Train {train_number} has no scheduled stops'})
        return issues
        
    if len(stops) == 1:
        issues.append({'check': 'Single-stop Journey', 'description': f'Train {train_number} has only one scheduled stop'})
        
    prev_station = None
    prev_day = None
    prev_dep = None
    
    for i, stop in enumerate(stops):
        station = stop.get('station')
        if not station:
            issues.append({'check': 'Missing Station', 'description': f'Train {train_number} stop sequence {i+1} is missing a station code'})
            
        if station and prev_station == station:
            issues.append({'check': 'Duplicate Consecutive Stations', 'description': f'Train {train_number} stops at {station} consecutively'})
            
        # Basic sequence check (if days and times are available)
        day = stop.get('day')
        arr = stop.get('scheduled_arrival')
        dep = stop.get('scheduled_departure')
        
        # It's expected that first stop might have 'None' arrival and last stop 'None' departure.
        if i > 0 and arr in (None, 'None', ''):
            issues.append({'check': 'Missing Intermediate Time', 'description': f'Train {train_number} missing arrival at {station}'})
        if i < len(stops) - 1 and dep in (None, 'None', ''):
            issues.append({'check': 'Missing Intermediate Time', 'description': f'Train {train_number} missing departure at {station}'})

        prev_station = station
        prev_day = day
        prev_dep = dep
        
    return issues
