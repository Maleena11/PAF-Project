# Smart Campus API Endpoints

Base URL: `http://localhost:8080/api`

---

## 🏢 Resources `/api/resources`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/resources` | List all resources (query: `status`, `type`, `search`) | Public |
| GET | `/resources/{id}` | Get resource by ID | Public |
| POST | `/resources` | Create resource | ADMIN/STAFF |
| PUT | `/resources/{id}` | Update resource | ADMIN/STAFF |
| PATCH | `/resources/{id}/status?status=` | Update status | ADMIN/STAFF |
| POST | `/resources/{id}/image` | Upload image (multipart) | ADMIN/STAFF |
| DELETE | `/resources/{id}` | Delete resource | ADMIN |

---

## 📅 Bookings `/api/bookings`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookings` | List all bookings | ADMIN/STAFF |
| GET | `/bookings/{id}` | Get booking by ID | Authenticated |
| GET | `/bookings/user/{userId}` | Get bookings for a user | Authenticated |
| GET | `/bookings/resource/{resourceId}` | Get bookings for a resource | Authenticated |
| POST | `/bookings` | Create booking | Authenticated |
| PATCH | `/bookings/{id}/status?status=` | Approve / Reject / Cancel | ADMIN/STAFF |
| DELETE | `/bookings/{id}` | Delete booking | ADMIN |

### Booking Request Body
```json
{
  "resourceId": 1,
  "userId": 2,
  "title": "Group Meeting",
  "startTime": "2026-03-20T09:00:00",
  "endTime":   "2026-03-20T11:00:00",
  "notes": "Optional notes"
}
```

---

## 🎫 Tickets `/api/tickets`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tickets` | List all tickets (query: `status`) | ADMIN/STAFF |
| GET | `/tickets/{id}` | Get ticket by ID | Authenticated |
| GET | `/tickets/user/{userId}` | Get tickets for a user | Authenticated |
| POST | `/tickets` | Create ticket | Authenticated |
| PATCH | `/tickets/{id}/status?status=` | Update ticket status | ADMIN/STAFF |
| PATCH | `/tickets/{id}/assign?assigneeId=` | Assign ticket | ADMIN/STAFF |
| POST | `/tickets/{id}/image` | Upload image (multipart) | Authenticated |
| POST | `/tickets/{id}/comments` | Add comment | Authenticated |
| DELETE | `/tickets/{id}` | Delete ticket | ADMIN |

### Ticket Request Body
```json
{
  "title": "Projector not working",
  "description": "Detailed description of the issue",
  "category": "MAINTENANCE",
  "priority": "HIGH",
  "userId": 2
}
```

---

## 🔔 Notifications `/api/notifications`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications/user/{userId}` | All notifications for user | Authenticated |
| GET | `/notifications/user/{userId}/unread` | Unread notifications | Authenticated |
| GET | `/notifications/user/{userId}/count` | Unread count | Authenticated |
| PATCH | `/notifications/{id}/read` | Mark notification as read | Authenticated |
| PATCH | `/notifications/user/{userId}/read-all` | Mark all as read | Authenticated |
| DELETE | `/notifications/{id}` | Delete notification | Authenticated |

---

## 🔐 Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth2/authorization/google` | Initiate Google OAuth2 login |
| POST | `/logout` | Log out and invalidate session |

---

## Enums Reference

| Enum | Values |
|------|--------|
| ResourceType | `LECTURE_HALL`, `LAB`, `MEETING_ROOM`, `SPORTS`, `STUDY_ROOM`, `AUDITORIUM`, `OTHER` |
| ResourceStatus | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `RETIRED` |
| BookingStatus | `PENDING`, `APPROVED`, `CANCELLED`, `REJECTED`, `COMPLETED` |
| TicketCategory | `MAINTENANCE`, `IT`, `FACILITIES`, `SECURITY`, `CLEANING`, `OTHER` |
| TicketPriority | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| TicketStatus | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| NotificationType | `BOOKING`, `TICKET`, `SYSTEM`, `GENERAL` |
| UserRole | `ADMIN`, `STAFF`, `STUDENT` |
