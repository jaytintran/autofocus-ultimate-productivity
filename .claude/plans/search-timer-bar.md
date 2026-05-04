# Plan: Add Search Functionality to Timer Bar Books/Projects Tabs

## Current State Analysis

The Timer Bar has two tabs (Books and Projects) displayed in the idle state on desktop:
- Located in `idle-input.tsx` (lines 302-344)
- Uses `CompactBooksList` and `CompactProjectsList` components
- Shows books grouped by: Reading, Not Started (collapsible), Completed (collapsible)
- Shows projects grouped by: Active, Planning, Completed (collapsible)
- No search functionality currently exists

## Requirements

1. Add search bars to both Books and Projects tabs
2. Determine what to display when searching

## Design Decisions Needed

### Search Bar Placement
- **Option A**: Place search bar above the tab switcher (Books/Projects buttons)
- **Option B**: Place search bar below the tab switcher, within each tab's content area
- **Recommendation**: Option B - keeps search contextual to the active tab

### Search Behavior

**For Books Search:**
- Search across: title, author
- Display results as a flat list (no grouping by status)
- Show all matching books regardless of status (reading, unread, completed)
- Include visual indicators: progress bar, rating, status badge
- Empty state: "No books match your search"

**For Projects Search:**
- Search across: title, category
- Display results as a flat list (no grouping by status)
- Show all matching projects regardless of status (active, planning, completed)
- Include visual indicators: progress bar, priority badge, status badge, due date
- Empty state: "No projects match your search"

### UI/UX Details
- Small search input with Search icon
- Debounced search (300-400ms)
- Clear button (X) when search has text
- Preserve existing card styling and interactions
- Search is case-insensitive
- When search is active, hide the collapsible sections and show flat results

## Implementation Plan

### 1. Update `CompactBooksList` Component
- Add search state and debounced search query
- Add search input UI above the book list
- Create filtered books list based on search query
- Conditionally render: grouped view (no search) vs flat search results
- Add empty state for no results

### 2. Update `CompactProjectsList` Component
- Add search state and debounced search query
- Add search input UI above the project list
- Create filtered projects list based on search query
- Conditionally render: grouped view (no search) vs flat search results
- Add empty state for no results

### 3. Styling Considerations
- Match existing input styling from the main focus input
- Use Search icon from lucide-react
- Keep search bar compact and unobtrusive
- Ensure search results maintain hover states and click handlers

## Files to Modify

1. `/home/jaytintran/projects/autofocus-af5/components/views/timer/compact-books-list.tsx`
   - Add search input
   - Add search state management
   - Add filtered results rendering

2. `/home/jaytintran/projects/autofocus-af5/components/views/timer/compact-projects-list.tsx`
   - Add search input
   - Add search state management
   - Add filtered results rendering

## Technical Details

- Use existing `useMemo` pattern for filtered results
- Debounce search with `useEffect` + `setTimeout` (similar to existing pattern in idle-input.tsx)
- Search logic: `item.field.toLowerCase().includes(query.toLowerCase())`
- Preserve all existing functionality (status changes, modals, etc.)

## Questions for User

1. Should the search be persistent across tab switches (Books ↔ Projects)?
   - **Recommendation**: No - clear search when switching tabs for cleaner UX

2. Should we search additional fields?
   - Books: notes, genre?
   - Projects: description, notes?
   - **Recommendation**: Start with title/author for books, title/category for projects. Can expand later.

3. Should completed/not-started items appear in search results?
   - **Recommendation**: Yes - search should be comprehensive across all statuses
