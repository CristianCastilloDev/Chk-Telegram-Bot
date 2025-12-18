/**
 * Escape special Markdown characters for Telegram
 * Prevents formatting issues with usernames containing _, *, [, ], (, ), ~, `, >, #, +, -, =, |, {, }, ., !
 */
export const escapeMarkdown = (text) => {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1');
};

/**
 * Escape username for Telegram mention
 * Only escapes underscore which is the most common issue
 */
export const escapeUsername = (username) => {
    if (!username) return '';
    return username.replace(/_/g, '\\_');
};

export default { escapeMarkdown, escapeUsername };
