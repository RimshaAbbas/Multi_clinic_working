/**
 * In-memory data store
 * In production, replace with a real database (PostgreSQL, MongoDB, etc.)
 */

export const BRANCHES = [
  { id: 'branch-1', name: 'MultiCare City Centre' },
  { id: 'branch-2', name: 'MultiCare Defence' },
  { id: 'branch-3', name: 'MultiCare Gulshan' },
]

export const SPECIALIZATIONS = [
  { id: 'dental',        label: 'Dental' },
  { id: 'dermatology',   label: 'Dermatology' },
  { id: 'physiotherapy', label: 'Physiotherapy' },
  { id: 'cardiology',    label: 'Cardiology' },
  { id: 'ophthalmology', label: 'Ophthalmology' },
  { id: 'general',       label: 'General Medicine' },
]

export const DOCTORS = [
  { id: 1, name: 'Dr. Sarah Ahmed',   specialty: 'dental',        branch: 'branch-1', availability: ['Mon', 'Wed', 'Fri'] },
  { id: 2, name: 'Dr. Kamran Malik',  specialty: 'dermatology',   branch: 'branch-1', availability: ['Tue', 'Thu', 'Sat'] },
  { id: 3, name: 'Dr. Nadia Hussain', specialty: 'physiotherapy', branch: 'branch-2', availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { id: 4, name: 'Dr. Omar Farooq',   specialty: 'cardiology',    branch: 'branch-2', availability: ['Mon', 'Tue', 'Thu'] },
  { id: 5, name: 'Dr. Aisha Raza',    specialty: 'ophthalmology', branch: 'branch-3', availability: ['Wed', 'Thu', 'Sat'] },
  { id: 6, name: 'Dr. Bilal Khan',    specialty: 'general',       branch: 'branch-3', availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
]

export const ALL_TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
]

// In-memory appointment store
export const appointments = []

// In-memory inquiry store
export const inquiries = []
