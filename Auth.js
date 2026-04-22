//Authentication module

const  AUTH_KEY = "kanban_auth_session";
const  ADMIN_CREDENTIALS = {
    username: "Admin",
    password: "Admin1234",
    email: "admin@bugtracker.com"
};

//User login status
function    isAuthenticated()   {
    const   session = localStorage.getItem(AUTH_KEY);
    if (!session) return false;

    try {
        const { expires, username } = JSON.parse(session);

        if (Date.now() > expires) {
            localStorage.removeItem(AUTH_KEY);
      return false;
    }
    return username === ADMIN_CREDENTIALS.username;
}   
catch (e) {
    return false;
  }
}

function login(username,password) {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
         const session = {
             username: username,
             expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            loginTime: new Date().toISOString()
             };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
     return true;
    }
    return false;
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "login.html";
}

function getCurrentUser() {
  const session = localStorage.getItem(AUTH_KEY);
  if (!session) return null;
  
  try {
    const { username, loginTime } = JSON.parse(session);
    return { username, loginTime };
  } catch (e) {
    return null;
  }
}

function requireAuth() {
  if (!isAuthenticated()) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    localStorage.setItem('redirectAfterLogin', currentPage);
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    const redirectPage = localStorage.getItem('redirectAfterLogin') || 'index.html';
    localStorage.removeItem('redirectAfterLogin');
    window.location.href = redirectPage;
    return true;
  }
  return false;
}