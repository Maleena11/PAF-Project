-- =============================================
-- Smart Campus - Seed Data
-- =============================================

-- Users
INSERT INTO users (id, name, email, role, provider, provider_id, created_at)
VALUES
  (1, 'Admin User',    'admin@campus.edu',   'ADMIN',   'local',  'local-1', CURRENT_TIMESTAMP),
  (2, 'Alice Johnson', 'alice@campus.edu',   'STUDENT', 'google', 'g-001',   CURRENT_TIMESTAMP),
  (3, 'Bob Smith',     'bob@campus.edu',     'STAFF',   'google', 'g-002',   CURRENT_TIMESTAMP),
  (4, 'Carol White',   'carol@campus.edu',   'STUDENT', 'google', 'g-003',   CURRENT_TIMESTAMP);

-- Resources
INSERT INTO resources (id, name, type, location, capacity, status, description, created_at)
VALUES
  (1, 'Lecture Hall A',     'LECTURE_HALL', 'Block A, Ground Floor', 200, 'AVAILABLE', 'Main lecture hall with projector and audio system', CURRENT_TIMESTAMP),
  (2, 'Computer Lab 1',     'LAB',          'Block B, First Floor',  40,  'AVAILABLE', 'Windows PCs with development tools installed',       CURRENT_TIMESTAMP),
  (3, 'Meeting Room 101',   'MEETING_ROOM', 'Admin Block, Floor 1',  12,  'AVAILABLE', 'Conference room with whiteboard and TV screen',       CURRENT_TIMESTAMP),
  (4, 'Sports Ground',      'SPORTS',       'Campus Grounds',        100, 'AVAILABLE', 'Multi-purpose outdoor sports area',                   CURRENT_TIMESTAMP),
  (5, 'Library Study Room', 'STUDY_ROOM',   'Library, Second Floor', 20,  'MAINTENANCE','Quiet study room — under maintenance',               CURRENT_TIMESTAMP);

-- Bookings
INSERT INTO bookings (id, resource_id, user_id, title, start_time, end_time, status, purpose, notes, created_at)
VALUES
  (1, 1, 2, 'PAF Lecture',          '2026-03-15 09:00:00', '2026-03-15 11:00:00', 'APPROVED',  'Weekly module lecture for first-year students',      'Weekly PAF module lecture',         CURRENT_TIMESTAMP),
  (2, 2, 3, 'Web Dev Workshop',     '2026-03-16 14:00:00', '2026-03-16 17:00:00', 'PENDING',   'Hands-on React and Spring Boot training',            'React & Spring Boot workshop',      CURRENT_TIMESTAMP),
  (3, 3, 4, 'Group Project Meeting','2026-03-17 10:00:00', '2026-03-17 12:00:00', 'APPROVED',  'Planning for smart campus group project deliverables','Smart Campus project discussion',   CURRENT_TIMESTAMP),
  (4, 1, 2, 'Guest Lecture',        '2026-03-18 09:00:00', '2026-03-18 10:00:00', 'CANCELLED', 'Guest speaker session on campus life',              'Speaker cancelled',                 CURRENT_TIMESTAMP);

-- Tickets
INSERT INTO tickets (id, title, description, category, priority, status, user_id, created_at)
VALUES
  (1, 'Projector not working in Hall A',  'The projector in Lecture Hall A fails to display HDMI input', 'MAINTENANCE', 'HIGH',   'OPEN',        1, CURRENT_TIMESTAMP),
  (2, 'AC broken in Lab 1',               'Air conditioning unit making loud noise and not cooling',      'MAINTENANCE', 'MEDIUM', 'IN_PROGRESS', 2, CURRENT_TIMESTAMP),
  (3, 'WiFi connectivity issue',          'No WiFi signal on the third floor of Block C',                 'IT',          'HIGH',   'OPEN',        3, CURRENT_TIMESTAMP),
  (4, 'Broken chairs in Meeting Room 101','Three chairs have broken legs and are unusable',               'FACILITIES',  'LOW',    'RESOLVED',    4, CURRENT_TIMESTAMP);

-- Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
VALUES
  (1, 2, 'Booking Approved',   'Your booking for Lecture Hall A on Mar 15 has been approved.',  'BOOKING',  false, CURRENT_TIMESTAMP),
  (2, 3, 'Booking Pending',    'Your Web Dev Workshop booking is under review.',                 'BOOKING',  false, CURRENT_TIMESTAMP),
  (3, 4, 'Booking Approved',   'Your Group Project Meeting booking has been approved.',          'BOOKING',  true,  CURRENT_TIMESTAMP),
  (4, 1, 'New Ticket',         'A new HIGH priority maintenance ticket has been submitted.',     'TICKET',   false, CURRENT_TIMESTAMP),
  (5, 2, 'Ticket Update',      'Ticket #2 (AC broken) is now IN PROGRESS.',                     'TICKET',   false, CURRENT_TIMESTAMP);

-- Comments
INSERT INTO comments (id, ticket_id, user_id, content, created_at)
VALUES
  (1, 1, 1, 'Technician has been notified. Will inspect tomorrow morning.',  CURRENT_TIMESTAMP),
  (2, 2, 3, 'The AC unit compressor is faulty. Parts ordered — 3 day ETA.',  CURRENT_TIMESTAMP),
  (3, 3, 1, 'IT team is investigating. Please use ethernet in the meantime.', CURRENT_TIMESTAMP);
