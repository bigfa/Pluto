# Feature Specification: Media View Count

**Feature Branch**: `001-media-view-count`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "增加图片浏览量"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Photo Views (Priority: P1)

When a visitor opens the lightbox to view a photo in detail, the system records a view. The view count is persisted and visible to others, giving the photographer insight into which photos attract the most attention.

**Why this priority**: This is the core functionality — without recording views, nothing else in the feature works.

**Independent Test**: Can be fully tested by opening a photo in the lightbox and verifying the view count increments. The count should persist across page refreshes.

**Acceptance Scenarios**:

1. **Given** a photo with 0 views, **When** a visitor opens it in the lightbox, **Then** the view count becomes 1.
2. **Given** a photo with 42 views, **When** a new visitor opens it, **Then** the view count becomes 43.
3. **Given** a visitor has already viewed a photo, **When** the same visitor opens it again within 5 minutes, **Then** the view count does NOT increment (debounce by IP).
4. **Given** a visitor has already viewed a photo, **When** the same visitor opens it again after 5 minutes, **Then** the view count increments.

---

### User Story 2 - Display View Count in UI (Priority: P2)

Visitors can see how many times a photo has been viewed. The view count appears in the lightbox alongside the existing likes count, providing social proof.

**Why this priority**: Displaying the data makes the feature visible and useful to visitors.

**Independent Test**: Can be tested by checking that the lightbox UI shows a view count number with an eye icon next to the existing likes display.

**Acceptance Scenarios**:

1. **Given** a photo with 100 views, **When** a visitor opens the lightbox, **Then** they see "100" displayed with an eye icon.
2. **Given** a photo with 0 views, **When** a visitor opens the lightbox, **Then** they see "0" displayed with an eye icon.
3. **Given** the view count increments, **When** the lightbox is already open, **Then** the displayed count updates.

---

### User Story 3 - Sort by Views (Priority: P3)

Visitors can sort the photo gallery by popularity (view count), in addition to the existing "date" and "likes" sort options.

**Why this priority**: Adds a new discovery dimension but not essential for the core feature.

**Independent Test**: Can be tested by selecting "views" sort option on the home page and verifying photos are ordered by view count descending.

**Acceptance Scenarios**:

1. **Given** the gallery is showing photos sorted by date, **When** a visitor selects "views" sort, **Then** photos are reordered by view count (highest first).
2. **Given** the gallery is sorted by views, **When** new views are recorded, **Then** the sort order reflects updated counts on next page load.

---

### User Story 4 - Admin View Statistics (Priority: P4)

The admin can see view counts in the media management table to understand which photos are most popular.

**Why this priority**: Admin-facing feature, useful but not visitor-critical.

**Independent Test**: Can be tested by logging into admin panel and verifying the media table displays a views column.

**Acceptance Scenarios**:

1. **Given** the admin is viewing the media list, **When** the page loads, **Then** each media item shows its view count.
2. **Given** the admin sorts by views, **When** the column header is clicked, **Then** items are sorted by view count.

---

### Edge Cases

- What happens when two visitors view the same photo at exactly the same time? Both views should be recorded.
- What happens when a photo is deleted? View counts are removed along with the media record.
- What happens under high traffic? The debounce mechanism (IP + time window) uses KV storage for fast lookup, preventing database pressure.
- What happens for bot/crawler traffic? Views from common bot User-Agents should not be counted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record a view when a visitor opens a photo in the lightbox.
- **FR-002**: System MUST debounce repeated views from the same IP address within a 5-minute window.
- **FR-003**: System MUST persist view counts in the database, associated with the media record.
- **FR-004**: System MUST display view count in the lightbox UI alongside the likes count.
- **FR-005**: System MUST expose a `POST /api/media/{id}/view` endpoint for recording views.
- **FR-006**: System MUST expose a `GET /api/media/{id}/view` endpoint for retrieving view counts.
- **FR-007**: System MUST support sorting the gallery by view count (descending).
- **FR-008**: System MUST display view counts in the admin media list table.
- **FR-009**: System MUST include `view_count` in the public media list and media detail API responses.
- **FR-010**: System MUST filter out views from common bot User-Agents.

### Key Entities

- **Media (extended)**: Existing entity, gains a `view_count` integer field (default 0).
- **View Debounce Record**: Temporary record stored in KV, keyed by `view:{media_id}:{ip_hash}`, with a 5-minute TTL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: View count increments within 1 second of a visitor opening the lightbox.
- **SC-002**: Duplicate views from the same visitor within 5 minutes are not counted (debounce accuracy > 99%).
- **SC-003**: View counts are visible to visitors in the lightbox for all photos.
- **SC-004**: Gallery can be sorted by views, with results reflecting current counts.
- **SC-005**: Admin can see and sort by view counts in the media management table.

## Assumptions

- The existing KV namespace (`FARALLON`) is available for debounce storage, following the same pattern as album view tracking.
- View recording is best-effort: a failed view record should not block the user experience.
- The 5-minute debounce window balances accuracy with practical visitor behavior.
- Bot detection is basic (User-Agent string matching), not a full anti-bot solution.
