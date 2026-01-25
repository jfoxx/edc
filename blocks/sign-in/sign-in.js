import ffetch from '../../scripts/ffetch.js';

/**
 * Generates a fake authentication token
 * @returns {string} A fake JWT-like token
 */
function generateFakeToken() {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
    sub: 'user',
  }));
  const signature = btoa(Math.random().toString(36).substring(2));
  return `${header}.${payload}.${signature}`;
}

/**
 * Finds a user in the users array by username/email
 * @param {Array} users - Array of user objects
 * @param {string} query - The username/email to search for
 * @returns {Array} Matching users
 */
function findUser(users, query) {
  const normalizedQuery = query.toLowerCase().trim();
  return users.filter((user) => {
    const username = (user.username || user.email || '').toLowerCase().trim();
    return username === normalizedQuery;
  });
}

/**
 * Stores user data in localStorage
 * @param {Object} user - The user object from the spreadsheet
 */
function storeUserData(user) {
  // Map spreadsheet fields to localStorage keys
  // Handles both camelCase and lowercase variations from spreadsheets
  const fieldMappings = {
    username: ['username', 'userName'],
    firstName: ['firstName', 'firstname', 'first_name', 'Firstname'],
    lastName: ['lastName', 'lastname', 'last_name', 'Lastname'],
    email: ['email', 'Email'],
    company: ['company', 'Company'],
    phone: ['phone', 'Phone'],
    role: ['role', 'Role'],
  };

  Object.entries(fieldMappings).forEach(([storageKey, possibleFields]) => {
    // Find the first matching field that has a value
    const value = possibleFields.reduce((found, field) => found || user[field], null);
    if (value) {
      localStorage.setItem(storageKey, value);
    }
  });

  // Store the fake auth token
  const token = generateFakeToken();
  localStorage.setItem('authToken', token);

  // Store login timestamp
  localStorage.setItem('loginTime', Date.now().toString());
}

/**
 * Handles the login form submission
 * @param {Event} event - The click event
 * @param {Array} allUsers - All users from the spreadsheet
 */
async function handleLogin(event, allUsers) {
  event.preventDefault();

  const form = document.querySelector('#sign-in-form');
  const usernameInput = form.querySelector('input[name="username"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  // Remove any existing error messages
  const existingError = form.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }

  // Validate inputs
  if (!username || !password) {
    const errorMessage = document.createElement('p');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'Please enter both username and password';
    form.prepend(errorMessage);
    return;
  }

  // Find the user
  const userMatch = findUser(allUsers, username);

  if (userMatch.length > 0) {
    const user = userMatch[0];

    // Check password if it exists in the spreadsheet
    // For demo purposes, accept any password if none is specified in the spreadsheet
    if (user.password && user.password !== password) {
      const errorMessage = document.createElement('p');
      errorMessage.className = 'error-message';
      errorMessage.textContent = 'Invalid password';
      form.prepend(errorMessage);
      return;
    }

    // Show loading state
    form.classList.add('submitting');

    // Store user data
    storeUserData(user);

    // Redirect after a brief delay to show the loading state
    setTimeout(() => {
      // Redirect to the page specified in the block or default to home
      const redirectUrl = form.dataset.redirect || '/';
      window.location.href = redirectUrl;
    }, 1500);
  } else {
    const errorMessage = document.createElement('p');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'User not found. Please check your username.';
    form.prepend(errorMessage);
  }
}

/**
 * Creates the sign-in form
 * @param {Element} block - The block element
 * @param {Array} allUsers - All users from the spreadsheet
 * @param {string} redirectUrl - URL to redirect after login
 */
function createSignInForm(block, allUsers, redirectUrl) {
  const formContainer = document.createElement('div');
  formContainer.id = 'sign-in-form';
  formContainer.className = 'sign-in-form';
  if (redirectUrl) {
    formContainer.dataset.redirect = redirectUrl;
  }

  formContainer.innerHTML = `
    <div class="form-group">
      <label for="username">Email / Username</label>
      <input name="username" type="email" id="username" autocomplete="username" required>
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input name="password" type="password" id="password" autocomplete="current-password" required>
    </div>
    <div class="form-actions">
      <a href="#" class="forgot-password">Forgot your password?</a>
      <button type="submit" class="button primary">Sign In</button>
    </div>
  `;

  block.appendChild(formContainer);

  // Add event listener for the submit button
  const submitButton = formContainer.querySelector('button');
  submitButton.addEventListener('click', (e) => handleLogin(e, allUsers));

  // Also handle Enter key on password field
  const passwordInput = formContainer.querySelector('input[name="password"]');
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLogin(e, allUsers);
    }
  });
}

/**
 * Decorates the sign-in block
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  // Get configuration from block content
  const config = {};
  const rows = [...block.querySelectorAll(':scope > div')];

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
      const value = cells[1].textContent.trim();
      config[key] = value;
    }
  });

  // Default endpoint for users spreadsheet
  const usersEndpoint = config['users-endpoint'] || '/admin/users.json';

  // Check for redirect URL in query string first (from header sign-in link),
  // then fall back to block config, then default to home
  const urlParams = new URLSearchParams(window.location.search);
  const queryRedirect = urlParams.get('redirect');
  const redirectUrl = queryRedirect ? decodeURIComponent(queryRedirect) : (config.redirect || '/');

  // Clear block content
  block.textContent = '';

  // Add a title if specified
  if (config.title) {
    const title = document.createElement('h2');
    title.textContent = config.title;
    block.appendChild(title);
  }

  try {
    // Fetch all users from the spreadsheet
    const allUsers = await ffetch(usersEndpoint).all();

    // Create the sign-in form
    createSignInForm(block, allUsers, redirectUrl);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading users:', error);

    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'sign-in-error';
    errorDiv.innerHTML = `
      <p>Unable to load sign-in form. Please try again later.</p>
    `;
    block.appendChild(errorDiv);
  }
}
