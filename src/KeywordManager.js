// src/KeywordManager.js
import React, { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { ref, remove } from "firebase/database"; // 추가
import { firestore, database } from "./firebaseConfig"; // database 추가

function KeywordManager({ words, isAdmin }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  // 키워드 삭제 처리 - Realtime Database 지원 추가
  const handleDelete = async (wordId, wordText) => {
    if (!isAdmin) return;
    
    if (deleteConfirm === wordId) {
      try {
        // Firestore에서 삭제
        if (wordId.startsWith('temp-')) {
          // 임시 ID인 경우 Firestore에서는 삭제할 필요 없음
        } else {
          await deleteDoc(doc(firestore, "coreKeywords", wordId));
        }
        
        // Realtime Database에서도 삭제
        const keyId = wordText.toLowerCase().replace(/\s+/g, '-');
        await remove(ref(database, `keywords/${keyId}`));
        
        setMessage({ 
          type: "success", 
          text: `"${wordText}" 키워드가 삭제되었습니다.` 
        });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } catch (error) {
        console.error("키워드 삭제 오류:", error);
        setMessage({ 
          type: "error", 
          text: `키워드 삭제 중 오류가 발생했습니다: ${error.message}` 
        });
      }
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(wordId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // 검색어에 따른 단어 필터링
  const filteredWords = searchTerm 
    ? words.filter(word => 
        word.text.toLowerCase().includes(searchTerm.toLowerCase()))
    : words;

  // 관리자가 아니면 아무것도 표시하지 않음
  if (!isAdmin) return null;

  return (
    <div style={{ 
      marginTop: "2rem",
      padding: "1.5rem",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    }}>
      <h3 style={{ 
        fontSize: "1.25rem",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span>키워드 관리</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="키워드 검색..."
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            width: "200px"
          }}
        />
      </h3>

      {message.text && (
        <div style={{ 
          padding: "0.75rem",
          marginBottom: "1rem",
          borderRadius: "4px",
          backgroundColor: message.type === "success" ? "#d4edda" : "#f8d7da",
          color: message.type === "success" ? "#155724" : "#721c24"
        }}>
          {message.text}
        </div>
      )}

      <div style={{ 
        maxHeight: "300px", 
        overflowY: "auto",
        border: "1px solid #dee2e6",
        borderRadius: "4px"
      }}>
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: "0.875rem"
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: "#e9ecef", 
              position: "sticky", 
              top: 0 
            }}>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>키워드</th>
              <th style={{ padding: "0.75rem", textAlign: "center" }}>빈도</th>
              <th style={{ padding: "0.75rem", textAlign: "center" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredWords.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ 
                  padding: "1rem", 
                  textAlign: "center",
                  color: "#6c757d"
                }}>
                  {searchTerm ? "검색 결과가 없습니다." : "등록된 키워드가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredWords
                .sort((a, b) => b.value - a.value)
                .map(word => (
                  <tr key={word.id} style={{ 
                    borderTop: "1px solid #dee2e6"
                  }}>
                    <td style={{ padding: "0.75rem" }}>{word.text}</td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>{word.value}</td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <button
                        onClick={() => handleDelete(word.id, word.text)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: deleteConfirm === word.id ? "#dc3545" : "#fff",
                          color: deleteConfirm === word.id ? "#fff" : "#dc3545",
                          border: "1px solid #dc3545",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.75rem"
                        }}
                      >
                        {deleteConfirm === word.id ? "확인" : "삭제"}
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default KeywordManager;