// server/mock/apps.js
const apps = [
    {
        id: '1',
        name: 'Employee Portal',
        description: 'Access company resources, HR information, and internal tools',
        logo: 'https://via.placeholder.com/100?text=EP',
        redirectUri: 'https://example.com/employee',
        groups: ['employees', 'admin']
    },
    {
        id: '2',
        name: 'Expense Management',
        description: 'Submit and track expenses, manage reimbursements',
        logo: 'https://via.placeholder.com/100?text=EM',
        redirectUri: 'https://example.com/expenses',
        groups: ['finance', 'admin']
    },
    {
        id: '3',
        name: 'Customer Database',
        description: 'Customer relationship management and sales tracking',
        logo: 'https://via.placeholder.com/100?text=CRM',
        redirectUri: 'https://example.com/crm',
        groups: ['sales', 'admin']
    },
    {
        id: '4',
        name: 'Analytics Dashboard',
        description: 'Business intelligence, reporting, and data visualization',
        logo: 'https://via.placeholder.com/100?text=BI',
        redirectUri: 'https://example.com/analytics',
        groups: ['executives', 'admin']
    }
];

module.exports = { apps };