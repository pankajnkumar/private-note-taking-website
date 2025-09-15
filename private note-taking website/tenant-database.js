// Multi-tenant data store for companies, memberships, plans, and notes
// Storage keys
const TENANTS_KEY = 'saas_tenants'; // [{id, name, plan:'free'|'pro'}]
const MEMBERSHIPS_KEY = 'saas_memberships'; // [{userEmail, tenantId, role:'admin'|'member'}]
const NOTES_KEY = 'saas_notes'; // [{id, tenantId, authorEmail, title, content, createdAt, updatedAt}]

function readStore(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
}

function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function id() { return Date.now().toString() + Math.random().toString(36).slice(2,8); }

export const tenantDB = {
    ensureInit() {
        if (!localStorage.getItem(TENANTS_KEY)) writeStore(TENANTS_KEY, []);
        if (!localStorage.getItem(MEMBERSHIPS_KEY)) writeStore(MEMBERSHIPS_KEY, []);
        if (!localStorage.getItem(NOTES_KEY)) writeStore(NOTES_KEY, []);
    },

    // Utility for invite codes
    _generateInviteCode() {
        return Math.random().toString(36).slice(2, 8).toUpperCase();
    },

    // Tenants (Teams)
    getOrCreateTenantByName(name) {
        this.ensureInit();
        const tenants = readStore(TENANTS_KEY, []);
        const existing = tenants.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;
        const newTenant = { id: id(), name: name.trim(), plan: 'free', createdAt: new Date().toISOString(), inviteCode: this._generateInviteCode(), ownerEmail: null };
        tenants.push(newTenant);
        writeStore(TENANTS_KEY, tenants);
        return newTenant;
    },
    // Create a team explicitly with owner
    createTeam(name, ownerEmail) {
        this.ensureInit();
        const tenants = readStore(TENANTS_KEY, []);
        const newTenant = { id: id(), name: name.trim(), plan: 'free', createdAt: new Date().toISOString(), inviteCode: this._generateInviteCode(), ownerEmail: (ownerEmail || '').toLowerCase() };
        tenants.push(newTenant);
        writeStore(TENANTS_KEY, tenants);
        // Owner becomes admin member
        this.addMembership((ownerEmail || '').toLowerCase(), newTenant.id, 'admin');
        return { success: true, tenant: newTenant };
    },
    getTenantById(tenantId) {
        const tenants = readStore(TENANTS_KEY, []);
        return tenants.find(t => t.id === tenantId) || null;
    },
    getTenantByInviteCode(code) {
        if (!code) return null;
        const tenants = readStore(TENANTS_KEY, []);
        return tenants.find(t => (t.inviteCode || '').toUpperCase() === String(code).toUpperCase()) || null;
    },
    rotateInviteCode(tenantId) {
        const tenants = readStore(TENANTS_KEY, []);
        const idx = tenants.findIndex(t => t.id === tenantId);
        if (idx === -1) return { success:false, message:'Tenant not found' };
        tenants[idx].inviteCode = this._generateInviteCode();
        writeStore(TENANTS_KEY, tenants);
        return { success:true, tenant: tenants[idx] };
    },
    listUserTeams(userEmail) {
        this.ensureInit();
        const email = (userEmail || '').toLowerCase();
        const memberships = readStore(MEMBERSHIPS_KEY, []);
        const myMemberships = memberships.filter(m => m.userEmail === email);
        const tenants = readStore(TENANTS_KEY, []);
        return myMemberships
            .map(m => tenants.find(t => t.id === m.tenantId))
            .filter(Boolean);
    },

    upgradeTenantToPro(tenantId) {
        const tenants = readStore(TENANTS_KEY, []);
        const idx = tenants.findIndex(t => t.id === tenantId);
        if (idx === -1) return { success:false, message:'Tenant not found' };
        tenants[idx].plan = 'pro';
        writeStore(TENANTS_KEY, tenants);
        return { success:true, tenant: tenants[idx] };
    },

    // Memberships
    addMembership(userEmail, tenantId, role) {
        this.ensureInit();
        const memberships = readStore(MEMBERSHIPS_KEY, []);
        const exists = memberships.find(m => m.userEmail === userEmail.toLowerCase() && m.tenantId === tenantId);
        if (exists) return exists;
        const newMembership = { userEmail: userEmail.toLowerCase(), tenantId, role: role === 'admin' ? 'admin' : 'member' };
        memberships.push(newMembership);
        writeStore(MEMBERSHIPS_KEY, memberships);
        return newMembership;
    },
    joinByInviteCode(userEmail, inviteCode) {
        this.ensureInit();
        const tenant = this.getTenantByInviteCode(inviteCode);
        if (!tenant) return { success:false, message:'Invalid invite code' };
        const member = this.addMembership((userEmail || '').toLowerCase(), tenant.id, 'member');
        return { success:true, tenant, member };
    },
    getMembership(userEmail) {
        const memberships = readStore(MEMBERSHIPS_KEY, []);
        return memberships.find(m => m.userEmail === userEmail.toLowerCase()) || null;
    },
    getMembershipForTenant(userEmail, tenantId) {
        const memberships = readStore(MEMBERSHIPS_KEY, []);
        return memberships.find(m => m.userEmail === userEmail.toLowerCase() && m.tenantId === tenantId) || null;
    },
    listMembers(tenantId) {
        const memberships = readStore(MEMBERSHIPS_KEY, []);
        return memberships.filter(m => m.tenantId === tenantId);
    },
    updateMemberRole(userEmail, tenantId, role) {
        const memberships = readStore(MEMBERSHIPS_KEY, []);
        const idx = memberships.findIndex(m => m.userEmail === userEmail.toLowerCase() && m.tenantId === tenantId);
        if (idx === -1) return { success:false, message:'Membership not found' };
        memberships[idx].role = role === 'admin' ? 'admin' : 'member';
        writeStore(MEMBERSHIPS_KEY, memberships);
        return { success:true, member: memberships[idx] };
    },

    // Notes
    listNotes(tenantId) {
        const notes = readStore(NOTES_KEY, []);
        return notes.filter(n => n.tenantId === tenantId).sort((a,b)=> new Date(b.updatedAt)-new Date(a.updatedAt));
    },
    countNotes(tenantId) {
        const notes = readStore(NOTES_KEY, []);
        return notes.filter(n => n.tenantId === tenantId).length;
    },
    createNote(tenantId, authorEmail, title, content) {
        this.ensureInit();
        const tenants = readStore(TENANTS_KEY, []);
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) return { success:false, message:'Tenant not found' };
        const isFree = tenant.plan !== 'pro';
        const existingCount = this.countNotes(tenantId);
        if (isFree && existingCount >= 3) return { success:false, message:'Free plan limit reached (3 notes). Upgrade to Pro.' };
        const notes = readStore(NOTES_KEY, []);
        const newNote = { id: id(), tenantId, authorEmail: authorEmail.toLowerCase(), title: title.trim(), content: content.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        notes.push(newNote);
        writeStore(NOTES_KEY, notes);
        return { success:true, note:newNote };
    },
    updateNote(tenantId, noteId, title, content) {
        const notes = readStore(NOTES_KEY, []);
        const idx = notes.findIndex(n => n.id === noteId && n.tenantId === tenantId);
        if (idx === -1) return { success:false, message:'Note not found' };
        notes[idx].title = title.trim();
        notes[idx].content = content.trim();
        notes[idx].updatedAt = new Date().toISOString();
        writeStore(NOTES_KEY, notes);
        return { success:true, note: notes[idx] };
    },
    deleteNote(tenantId, noteId) {
        const notes = readStore(NOTES_KEY, []);
        const next = notes.filter(n => !(n.id === noteId && n.tenantId === tenantId));
        writeStore(NOTES_KEY, next);
        return { success:true };
    }
};


