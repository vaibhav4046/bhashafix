# Deliberately unreachable fixture

This acceptance case targets `http://127.0.0.1:1`, where no fixture server is
started. The expected result is a truthful `failed` scan record, no report and
a retry action in the web workflow.
