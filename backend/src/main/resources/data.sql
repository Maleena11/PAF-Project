-- =============================================
-- Schema Migrations (continue-on-error=true handles duplicates)
-- =============================================
ALTER TABLE tickets MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'OPEN';
ALTER TABLE tickets MODIFY COLUMN category VARCHAR(50) NOT NULL;
ALTER TABLE tickets MODIFY COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE tickets ADD COLUMN first_response_at DATETIME NULL;
ALTER TABLE tickets ADD COLUMN resolution_notes TEXT NULL;
ALTER TABLE tickets ADD COLUMN rejection_reason TEXT NULL;
ALTER TABLE tickets ADD COLUMN rejected_at DATETIME NULL;

-- =============================================
-- Smart Campus - Seed Data
-- =============================================

-- Users
INSERT IGNORE INTO users (id, name, email, role, provider, provider_id, created_at)
VALUES
  (1, 'Admin User',    'it23616592@my.sliit.lk', 'ADMIN',   'local',  'local-1', CURRENT_TIMESTAMP),
  (2, 'Kumudi Tharumila',    'it23657014@my.sliit.lk', 'STUDENT', 'local',  'local-2', CURRENT_TIMESTAMP),
  (3, 'Maleena Karunarathna', 'it23642164@my.sliit.lk', 'STAFF',   'local',  'local-3', CURRENT_TIMESTAMP),
  (4, 'Thamali Ekanayaka',  'it23665866@my.sliit.lk', 'STUDENT', 'local',  'local-4', CURRENT_TIMESTAMP);

-- Update emails if old seed data already exists
UPDATE users SET email = 'it23616592@my.sliit.lk' WHERE id = 1 AND email = 'admin@campus.edu';
UPDATE users SET email = 'it23657014@my.sliit.lk' WHERE id = 2 AND email = 'alice@campus.edu';
UPDATE users SET email = 'it23642164@my.sliit.lk' WHERE id = 3 AND email = 'bob@campus.edu';
UPDATE users SET email = 'it23665866@my.sliit.lk' WHERE id = 4 AND email = 'carol@campus.edu';

-- Update names
UPDATE users SET name = 'Maleena Karunarathna' WHERE id = 3;
UPDATE users SET name = 'Kumudi Tharumila'     WHERE id = 2;
UPDATE users SET name = 'Thamali Ekanayaka'    WHERE id = 4;

-- Resources
INSERT IGNORE INTO resources (id, name, type, location, capacity, status, description, created_at)
VALUES
  (1, 'Lecture Hall A',     'LECTURE_HALL', 'Block A, Ground Floor', 200, 'AVAILABLE', 'Main lecture hall with projector and audio system', CURRENT_TIMESTAMP),
  (2, 'Computer Lab 1',     'LAB',          'Block B, First Floor',  40,  'AVAILABLE', 'Windows PCs with development tools installed',       CURRENT_TIMESTAMP),
  (3, 'Meeting Room 101',   'MEETING_ROOM', 'Admin Block, Floor 1',  12,  'AVAILABLE', 'Conference room with whiteboard and TV screen',       CURRENT_TIMESTAMP),
  (4, 'Sports Ground',      'SPORTS',       'Campus Grounds',        100, 'AVAILABLE', 'Multi-purpose outdoor sports area',                   CURRENT_TIMESTAMP),
  (5, 'Library Study Room', 'STUDY_ROOM',   'Library, Second Floor', 20,  'MAINTENANCE','Quiet study room — under maintenance',               CURRENT_TIMESTAMP);

-- Bookings
INSERT IGNORE INTO bookings (id, resource_id, user_id, title, start_time, end_time, status, purpose, expected_attendees, notes, created_at)
VALUES
  (1, 1, 2, 'PAF Lecture',          '2026-03-15 09:00:00', '2026-03-15 11:00:00', 'APPROVED',  'Weekly PAF module lecture',         120, 'Weekly PAF module lecture',         CURRENT_TIMESTAMP),
  (2, 2, 3, 'Web Dev Workshop',     '2026-03-16 14:00:00', '2026-03-16 17:00:00', 'PENDING',   'React & Spring Boot workshop',      30,  'React & Spring Boot workshop',      CURRENT_TIMESTAMP),
  (3, 3, 4, 'Group Project Meeting','2026-03-17 10:00:00', '2026-03-17 12:00:00', 'APPROVED',  'Smart Campus project discussion',   8,   'Smart Campus project discussion',   CURRENT_TIMESTAMP),
  (4, 1, 2, 'Guest Lecture',        '2026-03-18 09:00:00', '2026-03-18 10:00:00', 'CANCELLED', 'Industry guest speaker session',    150, 'Speaker cancelled',                 CURRENT_TIMESTAMP);

-- Tickets
INSERT IGNORE INTO tickets (id, title, description, category, priority, status, user_id, created_at)
VALUES
  (1, 'Projector not working in Hall A',  'The projector in Lecture Hall A fails to display HDMI input', 'MAINTENANCE', 'HIGH',   'OPEN',        1, CURRENT_TIMESTAMP),
  (3, 'WiFi connectivity issue',          'No WiFi signal on the third floor of Block C',                 'IT',          'HIGH',   'OPEN',        3, CURRENT_TIMESTAMP),
  (4, 'Broken chairs in Meeting Room 101','Three chairs have broken legs and are unusable',               'FACILITIES',  'LOW',    'RESOLVED',    4, CURRENT_TIMESTAMP);

-- Notifications
INSERT IGNORE INTO notifications (id, user_id, title, message, type, is_read, created_at)
VALUES
  (1, 2, 'Booking Approved',   'Your booking for Lecture Hall A on Mar 15 has been approved.',  'BOOKING',  false, CURRENT_TIMESTAMP),
  (2, 3, 'Booking Pending',    'Your Web Dev Workshop booking is under review.',                 'BOOKING',  false, CURRENT_TIMESTAMP),
  (3, 4, 'Booking Approved',   'Your Group Project Meeting booking has been approved.',          'BOOKING',  true,  CURRENT_TIMESTAMP),
  (4, 1, 'New Ticket',         'A new HIGH priority maintenance ticket has been submitted.',     'TICKET',   false, CURRENT_TIMESTAMP),
  (4, 1, 'New Ticket',         'A new HIGH priority maintenance ticket has been submitted.',     'TICKET',   false, CURRENT_TIMESTAMP);

-- Comments
INSERT IGNORE INTO comments (id, ticket_id, user_id, content, created_at)
VALUES
  (1, 1, 1, 'Technician has been notified. Will inspect tomorrow morning.',  CURRENT_TIMESTAMP),
  (3, 3, 1, 'IT team is investigating. Please use ethernet in the meantime.', CURRENT_TIMESTAMP);
