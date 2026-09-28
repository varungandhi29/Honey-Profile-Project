/**
 * Secure Data Vault Service
 * Supports Images, Videos, Documents, and Text notes.
 * Enforces Zero-Trust role isolation, password-protected access barriers,
 * and persistent storage with HoneyBus cross-tab notification.
 */

import { honeyBus } from './honeyBus'

const STORAGE_KEY = 'honeyshield_secure_vault'

export const DEFAULT_VAULT_ITEMS = [
  {
    id: 'VAULT-001',
    title: 'Executive Architecture Diagram',
    description: 'High-level cloud network infrastructure and bastion host routing',
    category: 'IMAGE',
    fileType: 'image/svg+xml',
    fileName: 'infrastructure_diagram.svg',
    fileSize: '42 KB',
    content: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="600" height="300" fill="%230F172A"/><circle cx="150" cy="150" r="60" fill="%231E293B" stroke="%2338BDF8" stroke-width="3"/><text x="150" y="155" fill="%2338BDF8" font-size="14" font-weight="bold" text-anchor="middle">API Gateway</text><line x1="210" y1="150" x2="390" y2="150" stroke="%2300FF88" stroke-width="2" stroke-dasharray="5,5"/><circle cx="450" cy="150" r="60" fill="%231E293B" stroke="%2300FF88" stroke-width="3"/><text x="450" y="155" fill="%2300FF88" font-size="14" font-weight="bold" text-anchor="middle">Secure Vault</text></svg>',
    uploadedBy: 'varun@g',
    uploaderRole: 'ADMIN',
    recipient: 'ALL_USERS',
    passwordProtected: true,
    accessPassword: 'user@123',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    lastEditedAt: null
  },
  {
    id: 'VAULT-002',
    title: 'Enterprise Encryption Master Keys',
    description: 'Quarterly rotating AES-256 keys and SOC compliance token',
    category: 'TEXT',
    fileType: 'text/plain',
    fileName: 'master_keys.txt',
    fileSize: '1.2 KB',
    content: '-----BEGIN HONEYSHIELD SECURE ENCLAVE DATA-----\nVAULT_ID: 99482-ENC-PROD\nAES_GCM_256: 7f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c\nHMAC_SECRET: d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9\nAUTHORIZED_OFFICER: Varun Gandhi (SecOps Command)\nSTATUS: VERIFIED & ACTIVE\n-----END HONEYSHIELD SECURE ENCLAVE DATA-----',
    uploadedBy: 'varun@g',
    uploaderRole: 'ADMIN',
    recipient: 'dhruv@l',
    passwordProtected: true,
    accessPassword: 'dhruv@123',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    lastEditedAt: null
  },
  {
    id: 'VAULT-003',
    title: 'Quarterly Audit & Financial Ledger',
    description: 'Audited balance sheets, salary disbursement logs, and tax filings',
    category: 'DOCUMENT',
    fileType: 'application/pdf',
    fileName: 'Q3_Financial_Ledger.pdf',
    fileSize: '1.8 MB',
    content: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAEr5HIKWbBgQW+yQmZeQWZ+nl5yfq6eXnJmUX4eAFWdCKgKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjMzCmVuZG9iagoxIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDIgMCBSIF0gL0NvdW50IDEgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAxIDAgUiAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA2IDAgUiA+PiA+PiAvTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdIC9Db250ZW50cyA0IDAgUiA+PgplbmRvYmoKMyAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMSAwIFIgPj4KZW5kb2JqCjYgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAxMjggMDAwMDAgbiAKMDAwMDAwMDE4NSAwMDAwMCBuIAowMDAwMDAwMjk5IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDExMCAwMDAwMCBuIAowMDAwMDAwMzQ4IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNyAvUm9vdCAzIDAgUiA+PgpzdGFydHhyZWYKMzUxCiUlRU9G',
    uploadedBy: 'varun@g',
    uploaderRole: 'ADMIN',
    recipient: 'rudra@b',
    passwordProtected: true,
    accessPassword: 'rudra@123',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    lastEditedAt: null
  }
]

export const getVaultItems = (currentUser) => {
  if (!currentUser) return []
  // Attackers have ZERO access to the true corporate vault
  if (currentUser.role === 'ATTACKER' || currentUser.username === 'darshan@p') {
    return []
  }

  let items = DEFAULT_VAULT_ITEMS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed
      }
    }
  } catch {}

  // Admins can see all vault files
  if (currentUser.role === 'ADMIN' || currentUser.isAdmin) {
    return items
  }

  // Regular users ONLY see:
  // 1. Files specifically sent to their username (e.g. 'dhruv@l')
  // 2. Files sent to 'ALL_USERS'
  // 3. Files they uploaded themselves
  return items.filter(item => {
    if (item.recipient === 'ALL_USERS') return true
    if (item.recipient && item.recipient.toLowerCase() === currentUser.username.toLowerCase()) return true
    if (item.uploadedBy && item.uploadedBy.toLowerCase() === currentUser.username.toLowerCase()) return true
    return false
  })
}

export const getAllVaultItemsForAdmin = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_VAULT_ITEMS
}

export const saveVaultItems = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    honeyBus.publish('VAULT_UPDATED', { count: items.length })
  } catch (err) {
    console.error('[Vault] Save error:', err)
  }
}

export const addVaultItem = (itemData, currentUser) => {
  const current = getAllVaultItemsForAdmin()
  const newItem = {
    id: `VAULT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    title: itemData.title?.trim() || 'Untitled File',
    description: itemData.description?.trim() || '',
    category: itemData.category || 'DOCUMENT', // IMAGE, VIDEO, DOCUMENT, TEXT
    fileType: itemData.fileType || 'application/octet-stream',
    fileName: itemData.fileName || 'file',
    fileSize: itemData.fileSize || '1 KB',
    content: itemData.content || '',
    uploadedBy: currentUser?.username || 'admin',
    uploaderRole: currentUser?.role || 'USER',
    recipient: itemData.recipient || 'ALL_USERS',
    passwordProtected: Boolean(itemData.accessPassword),
    accessPassword: itemData.accessPassword?.trim() || '',
    createdAt: new Date().toISOString(),
    lastEditedAt: null
  }

  const updated = [newItem, ...current]
  saveVaultItems(updated)
  return newItem
}

export const updateVaultItem = (id, updates, currentUser) => {
  const current = getAllVaultItemsForAdmin()
  const idx = current.findIndex(i => i.id === id)
  if (idx === -1) return null

  // Check authorization: only admin or original uploader can edit
  const existing = current[idx]
  if (currentUser?.role !== 'ADMIN' && existing.uploadedBy !== currentUser?.username) {
    throw new Error('Unauthorized to modify this vault record')
  }

  const updatedItem = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable ID
    uploadedBy: existing.uploadedBy,
    passwordProtected: updates.accessPassword !== undefined ? Boolean(updates.accessPassword) : existing.passwordProtected,
    lastEditedAt: new Date().toISOString()
  }

  current[idx] = updatedItem
  saveVaultItems(current)
  return updatedItem
}

export const deleteVaultItem = (id, currentUser) => {
  const current = getAllVaultItemsForAdmin()
  const existing = current.find(i => i.id === id)
  if (!existing) return false

  if (currentUser?.role !== 'ADMIN' && existing.uploadedBy !== currentUser?.username) {
    throw new Error('Unauthorized to delete this vault record')
  }

  const filtered = current.filter(i => i.id !== id)
  saveVaultItems(filtered)
  return true
}

export const verifyVaultPassword = (item, passwordAttempt) => {
  if (!item.passwordProtected || !item.accessPassword) {
    return true
  }
  return item.accessPassword.trim() === (passwordAttempt || '').trim()
}
