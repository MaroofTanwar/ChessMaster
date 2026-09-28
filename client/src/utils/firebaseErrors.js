const messages = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Please choose a stronger password with at least 6 characters.',
  'auth/password-does-not-meet-requirements': 'Your password does not meet the account security requirements.',
  'auth/email-already-in-use': 'This email is already registered. Please sign in or reset your password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled yet. Please contact the app owner.',
  'auth/invalid-api-key': 'Sign-in is not configured correctly. Please contact the app owner.',
  'auth/app-not-authorized': 'This app is not authorized to sign in. Please contact the app owner.',
  'auth/unauthorized-domain': 'This website is not authorized to sign in. Please contact the app owner.',
  'auth/web-storage-unsupported': 'Your browser is blocking sign-in storage. Please allow site storage and try again.',
  'permission-denied': 'Your profile could not be accessed. Please contact the app owner to check profile permissions.',
  'unavailable': 'Your profile is temporarily unavailable. Check your connection and try again.',
  'deadline-exceeded': 'Loading your profile took too long. Please try again.',
};
export function firebaseErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return messages[error?.code] || fallback;
}