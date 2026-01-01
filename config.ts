// Centralized application configuration
// This file contains app-wide constants to ensure a single source of truth

/**
 * List of admin email addresses
 * These users have access to restricted modules like Dashboard, Inventory, Stock Registry, and Reports
 */
export const ADMIN_EMAILS = [
    "bharathpersonalai@gmail.com",
    "naturehydrovation@gmail.com",
];

/**
 * Check if an email is an admin email
 * @param email - email address to check
 * @returns true if the email belongs to an admin
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};
