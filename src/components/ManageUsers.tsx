
"use client";

import { useCallback, useEffect, useState } from "react";

type ManagedUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
};

export default function ManageUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");

  const [verifiedUserId, setVerifiedUserId] = useState<number | null>(
    null
  );
  const [passwordIsCorrect, setPasswordIsCorrect] = useState<
    boolean | null
  >(null);

  const [activeAction, setActiveAction] = useState<
    "change" | "verify" | null
  >(null);

  
const loadUsers = useCallback(async () => {
  try {
    const response = await fetch("/api/users", {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to load users.");
    }

    setUsers(Array.isArray(data) ? data : data?.users ?? []);
    setError("");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong while loading users."
    );
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadUsers();
  }, 0);

  return () => window.clearTimeout(timer);
}, [loadUsers]);

  async function createUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to create user.");
      }

      setMessage(data?.message || "User created successfully.");
      setName("");
      setUsername("");
      setPassword("");
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const userId = Number(selectedUserId);

    if (!userId || !newPassword) {
      setError("Select a user and enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to change password.");
      }

      setMessage(data?.message || "Password changed successfully.");
      setNewPassword("");
      setActiveAction(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change password."
      );
    } finally {
      setSaving(false);
    }
  }

  async function verifyUserPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setError("");
    setPasswordIsCorrect(null);
    setVerifiedUserId(null);

    const userId = Number(selectedUserId);

    if (!userId || !verifyPassword) {
      setError("Select a user and enter their password.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/users/${userId}/verify-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: verifyPassword }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Password verification failed.");
      }

      const isValid =
        data?.valid ??
        data?.isValid ??
        data?.verified ??
        data?.success;

      if (typeof isValid !== "boolean") {
        throw new Error(
          "The API response does not contain a recognized verification result. Check your verify-password route."
        );
      }

      setVerifiedUserId(userId);
      setPasswordIsCorrect(isValid);
      setVerifyPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password verification failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: ManagedUser) {
    const confirmed = window.confirm(
      `Delete the account "${user.username}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete user.");
      }

      setMessage(data?.message || "User deleted successfully.");

      if (Number(selectedUserId) === user.id) {
        setSelectedUserId("");
        setNewPassword("");
        setVerifyPassword("");
        setActiveAction(null);
      }

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete user."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Manage Users</h2>
          <p className="text-secondary mb-0">
            Create accounts and manage user access.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => void loadUsers()}
          disabled={loading || saving}
        >
          <i className="bi bi-arrow-clockwise me-2" />
          Refresh
        </button>
      </div>

      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3">
            <i className="bi bi-person-plus me-2" />
            Create User Account
          </h5>

          <form onSubmit={createUser}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label htmlFor="new-user-name" className="form-label">
                  Full Name
                </label>
                <input
                  id="new-user-name"
                  className="form-control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="new-user-username" className="form-label">
                  Username
                </label>
                <input
                  id="new-user-username"
                  className="form-control"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="new-user-password" className="form-label">
                  Initial Password
                </label>
                <input
                  id="new-user-password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Please wait..." : "Create Account"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3">User Accounts</h5>

          {loading ? (
            <p className="text-secondary mb-0">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-secondary mb-0">
              No user accounts were returned by the API.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.username}</td>
                      <td>
                        <span
                          className={`badge ${
                            user.role === "ADMIN"
                              ? "text-bg-primary"
                              : "text-bg-secondary"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            user.isActive
                              ? "text-bg-success"
                              : "text-bg-danger"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            disabled={saving}
                            onClick={() => {
                              setSelectedUserId(String(user.id));
                              setActiveAction("change");
                              setMessage("");
                              setError("");
                              setPasswordIsCorrect(null);
                              setVerifiedUserId(null);
                            }}
                          >
                            Change Password
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            disabled={saving}
                            onClick={() => {
                              setSelectedUserId(String(user.id));
                              setActiveAction("verify");
                              setMessage("");
                              setError("");
                              setPasswordIsCorrect(null);
                              setVerifiedUserId(null);
                            }}
                          >
                            Verify
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={saving}
                            onClick={() => void deleteUser(user)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {activeAction && (
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                {activeAction === "change"
                  ? "Change User Password"
                  : "Verify User Password"}
              </h5>

              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => {
                  setActiveAction(null);
                  setNewPassword("");
                  setVerifyPassword("");
                  setPasswordIsCorrect(null);
                  setVerifiedUserId(null);
                }}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="selected-user" className="form-label">
                Select User
              </label>
              <select
                id="selected-user"
                className="form-select"
                value={selectedUserId}
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setPasswordIsCorrect(null);
                  setVerifiedUserId(null);
                }}
                required
              >
                <option value="">Choose an account...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} — {user.name}
                  </option>
                ))}
              </select>
            </div>

            {activeAction === "change" ? (
              <form onSubmit={changePassword}>
                <div className="mb-3">
                  <label htmlFor="new-password" className="form-label">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Enter the new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Update Password"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyUserPassword}>
                <div className="mb-3">
                  <label htmlFor="verify-password" className="form-label">
                    Current Password to Verify
                  </label>
                  <input
                    id="verify-password"
                    type="password"
                    className="form-control"
                    value={verifyPassword}
                    onChange={(event) =>
                      setVerifyPassword(event.target.value)
                    }
                    autoComplete="off"
                    placeholder="Enter the password to check"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? "Checking..." : "Verify Password"}
                </button>

                {verifiedUserId === Number(selectedUserId) &&
                  passwordIsCorrect !== null && (
                    <div
                      className={`alert mt-3 mb-0 ${
                        passwordIsCorrect
                          ? "alert-success"
                          : "alert-danger"
                      }`}
                      role="status"
                    >
                      {passwordIsCorrect
                        ? "The password is correct."
                        : "The password does not match."}
                    </div>
                  )}
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
