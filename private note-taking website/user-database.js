// User Database System for DeFiLaunch
// This file handles user registration, login validation, and data storage

class UserDatabase {
    constructor() {
        this.storageKey = 'defilaunch_users';
        this.currentUserKey = 'defilaunch_current_user';
        this.initDatabase();
    }

    // Initialize database - create empty array if no users exist
    initDatabase() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    // Simple hash function for passwords (basic security)
    hashPassword(password) {
        let hash = 0;
        if (password.length === 0) return hash;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Check if user already exists
    userExists(email) {
        const users = this.getAllUsers();
        return users.some(user => user.email.toLowerCase() === email.toLowerCase());
    }

    // Get all registered users
    getAllUsers() {
        const usersData = localStorage.getItem(this.storageKey);
        return usersData ? JSON.parse(usersData) : [];
    }

    // Register a new user
    registerUser(userData) {
        const { name, companyName, email, password, role } = userData;
        
        // Validate input
        if (!name || !email || !password) {
            return { success: false, message: 'All fields are required' };
        }

        // Check if user already exists
        if (this.userExists(email)) {
            return { success: false, message: 'User with this email already exists' };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, message: 'Please enter a valid email address' };
        }

        // Validate password strength
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long' };
        }

        // Create new user object
        const newUser = {
            id: Date.now().toString(), // Simple ID generation
            name: name.trim(),
            companyName: (companyName || '').trim(),
            email: email.toLowerCase().trim(),
            password: this.hashPassword(password), // Hash the password
            role: (role === 'admin' || role === 'member') ? role : 'member',
            registeredAt: new Date().toISOString(),
            isVerified: false,
            lastLogin: null
        };

        // Add user to database
        const users = this.getAllUsers();
        users.push(newUser);
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        return { success: true, message: 'User registered successfully', user: newUser };
    }

    // Verify user account (after OTP verification)
    verifyUser(email) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.email === email.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex].isVerified = true;
            localStorage.setItem(this.storageKey, JSON.stringify(users));
            return { success: true, message: 'Account verified successfully' };
        }
        
        return { success: false, message: 'User not found' };
    }

    // Login user
    loginUser(email, password) {
        const users = this.getAllUsers();
        const user = users.find(user => user.email === email.toLowerCase());
        
        if (!user) {
            return { success: false, message: 'User not found. Please register first.' };
        }

        if (!user.isVerified) {
            return { success: false, message: 'Please verify your email first.' };
        }

        if (user.password !== this.hashPassword(password)) {
            return { success: false, message: 'Invalid password' };
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        const userIndex = users.findIndex(u => u.email === email.toLowerCase());
        users[userIndex] = user;
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        // Store current user session
        const currentUserData = {
            id: user.id,
            name: user.name,
            companyName: user.companyName || '',
            role: user.role || 'member',
            email: user.email,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.currentUserKey, JSON.stringify(currentUserData));

        return { success: true, message: 'Login successful', user: currentUserData };
    }

    // Get current logged-in user
    getCurrentUser() {
        const userData = localStorage.getItem(this.currentUserKey);
        return userData ? JSON.parse(userData) : null;
    }

    // Logout user
    logout() {
        localStorage.removeItem(this.currentUserKey);
        return { success: true, message: 'Logged out successfully' };
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // Get user by email (for OTP verification)
    getUserByEmail(email) {
        const users = this.getAllUsers();
        return users.find(user => user.email === email.toLowerCase());
    }

    // Update user after OTP verification
    updateUserAfterVerification(email, userData) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.email === email.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex].isVerified = true;
            users[userIndex].lastLogin = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(users));

            // Store current user session (ensure role is preserved)
            const currentUserData = {
                id: users[userIndex].id,
                name: users[userIndex].name,
                companyName: users[userIndex].companyName || '',
                role: users[userIndex].role || 'member',
                email: users[userIndex].email,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem(this.currentUserKey, JSON.stringify(currentUserData));

            return { success: true, user: currentUserData };
        }
        
        return { success: false, message: 'User not found' };
    }

    // Get user statistics (for admin purposes)
    getUserStats() {
        const users = this.getAllUsers();
        const verifiedUsers = users.filter(user => user.isVerified);
        const recentUsers = users.filter(user => {
            const registrationDate = new Date(user.registeredAt);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return registrationDate > thirtyDaysAgo;
        });

        return {
            totalUsers: users.length,
            verifiedUsers: verifiedUsers.length,
            unverifiedUsers: users.length - verifiedUsers.length,
            recentUsers: recentUsers.length
        };
    }

    // Reset user password
    resetPassword(email, newPassword) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.email === email.toLowerCase());
        
        if (userIndex === -1) {
            return { success: false, message: 'User not found' };
        }

        // Validate new password
        if (newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long' };
        }

        // Update password
        users[userIndex].password = this.hashPassword(newPassword);
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        return { success: true, message: 'Password reset successfully' };
    }

    // Clear all data (for testing purposes)
    clearDatabase() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.currentUserKey);
        this.initDatabase();
    }

    // Delete a specific user by email
    deleteUserByEmail(email) {
        const users = this.getAllUsers();
        const normalized = email.toLowerCase();
        const next = users.filter(u => u.email !== normalized);
        if (next.length === users.length) {
            return { success: false, message: 'User not found' };
        }
        localStorage.setItem(this.storageKey, JSON.stringify(next));

        // If the deleted user is currently logged in, log them out
        const current = this.getCurrentUser();
        if (current && (current.email || '').toLowerCase() === normalized) {
            this.logout();
        }

        return { success: true, message: 'User deleted successfully' };
    }
}

// Create global instance
const userDB = new UserDatabase();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDatabase;
}
