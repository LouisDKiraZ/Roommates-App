const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return (
    username.length >= 3 && username.length <= 20 && USERNAME_PATTERN.test(username)
  );
}
