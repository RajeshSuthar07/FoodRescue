const COLORS = {
  Available: 'bg-green-100 text-green-700',
  Requested: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  'Vehicle Assigned': 'bg-indigo-100 text-indigo-700',
  'Pickup in Progress': 'bg-indigo-100 text-indigo-700',
  'On the Way': 'bg-indigo-100 text-indigo-700',
  'Arrived at Pickup': 'bg-purple-100 text-purple-700',
  'Food Picked Up': 'bg-purple-100 text-purple-700',
  Delivering: 'bg-sky-100 text-sky-700',
  'Arrived at NGO': 'bg-sky-100 text-sky-700',
  Delivered: 'bg-teal-100 text-teal-700',
  Completed: 'bg-brand-100 text-brand-700',
  Rejected: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-200 text-gray-600',
  Pending: 'bg-amber-100 text-amber-700',
  Offline: 'bg-gray-200 text-gray-600',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
