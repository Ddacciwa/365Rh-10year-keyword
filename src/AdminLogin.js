// src/AdminLogin.js
import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

function AdminLogin({ isAdmin, setIsAdmin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      setIsAdmin(true);
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("로그인 오류:", error);
      setError("관리자 로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setIsAdmin(false);
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  if (isAdmin) {
    return (
      <div style={{ 
        textAlign: "right", 
        marginBottom: "1rem", 
        padding: "0.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px"
      }}>
        <span style={{ marginRight: "1rem", color: "#28a745" }}>
          <strong>관리자 모드</strong>
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.25rem 0.75rem",
            backgroundColor: "#f8f9fa",
            color: "#dc3545",
            border: "1px solid #dc3545",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} style={{ maxWidth: "300px", margin: "0 0 1rem auto" }}>
      {error && (
        <div style={{ color: "#dc3545", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="관리자 이메일"
          required
          style={{
            padding: "0.375rem 0.75rem",
            border: "1px solid #ced4da",
            borderRadius: "4px"
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          style={{
            padding: "0.375rem 0.75rem",
            border: "1px solid #ced4da",
            borderRadius: "4px"
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.375rem 0.75rem",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.65 : 1
          }}
        >
          {loading ? "로그인 중..." : "관리자 로그인"}
        </button>
      </div>
    </form>
  );
}

export default AdminLogin;