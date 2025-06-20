// Modern Professional KeywordCloud Component
import { ref, set, update, onValue, get } from "firebase/database";
import { database } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";
import AdminLogin from "./AdminLogin";
import KeywordManager from "./KeywordManager";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import hospitalLogo from './hospital-logo.png';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { firestore } from "./firebaseConfig";

function KeywordCloud() {
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const keywordsRef = useMemo(() => ref(database, "keywords"), []);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [lastKeyword, setLastKeyword] = useState("");
  const [lastKeywordTime, setLastKeywordTime] = useState(0);
  const [duplicateError, setDuplicateError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Modern professional color palette
  const colorPalette = useMemo(() => [
    "#1e40af", "#059669", "#dc2626", "#ea580c", "#7c3aed", 
    "#0891b2", "#65a30d", "#ca8a04", "#be123c", "#9333ea",
    "#0284c7", "#16a34a", "#dc2626", "#ea580c", "#8b5cf6",
    "#0e7490", "#4d7c0f", "#a16207", "#be185d", "#7c2d12",
    "#1e3a8a", "#064e3b", "#991b1b", "#9a3412", "#581c87"
  ], []);

  // 창 크기 변경 감지 (디바운스 적용)
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);
  
  // 관리자 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);
  
  // Firebase 연결 테스트
  useEffect(() => {
    console.log("Firebase 연결 테스트 시작");
    
    try {
      console.log("Firestore 인스턴스:", firestore);
      console.log("Realtime Database 인스턴스:", database);
      console.log("Auth 인스턴스:", auth);
      
      // 테스트 데이터 생성
      const testRef = ref(database, "test");
      set(testRef, {
        message: "연결 테스트",
        timestamp: new Date().toISOString()
      })
      .then(() => {
        console.log("테스트 데이터 저장 성공!");
      })
      .catch((error) => {
        console.error("테스트 데이터 저장 오류:", error);
      });
    } catch (error) {
      console.error("Firebase 초기화 오류:", error);
    }
  }, []);

  // Realtime Database에서 키워드 데이터 실시간 가져오기
  useEffect(() => {
    setLoading(true);
    console.log("Realtime Database 구독 시작");
    
    try {
      const unsubscribe = onValue(keywordsRef, (snapshot) => {
        console.log("Realtime Database에서 데이터 수신");
        const data = snapshot.val();
        if (data) {
          console.log("수신된 데이터:", data);
          
          const keywordList = Object.entries(data).map(([id, val]) => ({
            id,
            text: val.text,
            value: val.value || 1,
            important: val.important || false,
            completed: val.completed || false,
            createdAt: val.createdAt || "",
            updatedAt: val.updatedAt || ""
          }));
          
          setWords(prevWords => {
            const wordMap = new Map();
            
            prevWords.forEach(word => {
              const key = word.id || word.text;
              wordMap.set(key, word);
            });
            
            keywordList.forEach(newWord => {
              const key = newWord.id || newWord.text;
              const existingWord = wordMap.get(key);
              
              if (!existingWord) {
                wordMap.set(key, newWord);
              } else {
                wordMap.set(key, {
                  ...existingWord,
                  value: Math.max(existingWord.value, newWord.value),
                  important: newWord.important,
                  completed: newWord.completed,
                  createdAt: newWord.createdAt || existingWord.createdAt,
                  updatedAt: newWord.updatedAt || existingWord.updatedAt
                });
              }
            });
            
            return Array.from(wordMap.values());
          });
        } else {
          console.log("데이터가 없습니다.");
        }
        setLoading(false);
      }, (error) => {
        console.error("Realtime Database 구독 오류:", error);
        setError("데이터를 불러오는 중 오류가 발생했습니다: " + error.message);
        setLoading(false);
      });
      
      return () => {
        console.log("Realtime Database 구독 해제");
        unsubscribe();
      };
    } catch (error) {
      console.error("Realtime Database 구독 설정 오류:", error);
      setError("Firebase 연결 중 오류가 발생했습니다: " + error.message);
      setLoading(false);
    }
  }, [keywordsRef]);

  // 키워드 제출 함수 개선
  const handleSubmit = useCallback(async () => {
    const keyword = input.trim();
    if (!keyword) return;
    
    const currentTime = new Date().getTime();
    if (keyword === lastKeyword && currentTime - lastKeywordTime < 10000) {
      setDuplicateError(true);
      setTimeout(() => setDuplicateError(false), 3000);
      return;
    }

    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 300);

    try {
      setWords(prev => {
        const found = prev.find(w => w.text === keyword);
        if (found) {
          return prev.map(w => w.text === keyword ? {...w, value: w.value + 1} : w);
        } else {
          return [...prev, {text: keyword, value: 1}];
        }
      });

      setInput("");
      setLastKeyword(keyword);
      setLastKeywordTime(currentTime);

      const now = new Date().toISOString();
      const keyId = keyword.toLowerCase().replace(/\s+/g, '-');
      const keywordRef = ref(database, `keywords/${keyId}`);
      
      console.log("키워드 저장 시도:", keyword);
      
      const snapshot = await get(keywordRef);
      
      if (snapshot.exists()) {
        const currentValue = snapshot.val().value || 0;
        const isCompleted = snapshot.val().completed || false;
        const isImportant = snapshot.val().important || false;
        
        await update(keywordRef, {
          text: keyword,
          value: currentValue + 1,
          updatedAt: now,
          completed: isCompleted,
          important: isImportant
        });
      } else {
        await set(keywordRef, {
          text: keyword,
          value: 1,
          createdAt: now,
          updatedAt: now,
          completed: false,
          important: false
        });
      }

      // Firestore에도 저장
      const firestoreRef = collection(firestore, "coreKeywords");
      const q = query(firestoreRef, where("text", "==", keyword));
      const firestoreSnapshot = await getDocs(q);

      if (!firestoreSnapshot.empty) {
        const docRef = firestoreSnapshot.docs[0].ref;
        await updateDoc(docRef, {
          value: increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(firestoreRef, {
          text: keyword,
          value: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          completed: false,
          important: false
        });
      }
      
      console.log("키워드 저장 성공!");
    } catch (err) {
      console.error("제출 오류:", err);
      setError("키워드를 저장하는 중 오류가 발생했습니다: " + err.message);
    }
  }, [input, lastKeyword, lastKeywordTime]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  // 개선된 폰트 크기 계산 함수
  const calculateFontSize = useCallback((value) => {
    const minSize = 14;
    const maxSize = 60;
    
    if (value <= 15) {
      return minSize + ((value - 1) / 14) * (maxSize - minSize);
    } else {
      return maxSize + (value - 15) * 1.5;
    }
  }, []);

  const containerHeight = useMemo(() => {
    if (windowSize.width < 576) return 450;
    if (windowSize.width < 992) return 550;
    return 650;
  }, [windowSize.width]);

  const maxWords = useMemo(() => {
    if (windowSize.width < 576) return 40;
    if (windowSize.width < 992) return 60;
    return 80;
  }, [windowSize.width]);

  // 개선된 색상 선택 함수
  const getWordColor = useCallback((word, value) => {
    const wordValue = value || (typeof word === 'object' ? word.value : 1);
    
    if (wordValue > 10) {
      return [colorPalette[0], colorPalette[2], colorPalette[4]][Math.floor(Math.random() * 3)];
    } else if (wordValue > 5) {
      return [colorPalette[1], colorPalette[3], colorPalette[6]][Math.floor(Math.random() * 3)];
    } else if (wordValue > 2) {
      return [colorPalette[7], colorPalette[8], colorPalette[9]][Math.floor(Math.random() * 3)];
    } else {
      return [colorPalette[10], colorPalette[11], colorPalette[12]][Math.floor(Math.random() * 3)];
    }
  }, [colorPalette]);

  const uniqueWords = useMemo(() => {
    return Array.from(new Map(words.map(item => [item.text, item])).values());
  }, [words]);

  const sortedWords = useMemo(() => {
    return [...uniqueWords]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords);
  }, [uniqueWords, maxWords]);

  return (
    <div className="App">
      {/* 관리자 로그인 영역 */}
      <AdminLogin isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      
      {/* 헤더 섹션 */}
      <div className="header-section">
        <div className="logo-container">
          <img 
            src={hospitalLogo} 
            alt="광주365재활병원 로고" 
            className="hospital-logo"
          />
        </div>
        <h1 className="main-title">
          광주365재활병원 직원이 바라보는
          <br />
          앞으로의 핵심 키워드
        </h1>
        <p className="subtitle">
          본원이 지향하는 미래에 대한 키워드들을 선정하여 인포그래픽으로 도식화하여 소개합니다.
          <br />
          여러분의 소중한 의견을 통해 병원의 비전을 함께 만들어갑니다.
        </p>
      </div>

      {/* 메인 컨테이너 */}
      <div style={{
        maxWidth: windowSize.width < 768 ? "100%" : "1200px",
        margin: "0 auto",
        padding: windowSize.width < 576 ? "1rem" : "2rem",
      }}>
        
        {/* 입력 영역 */}
        <div className="input-container">
          <div className="input-group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="미래 비전을 위한 핵심 키워드를 입력해주세요 (예: 환자중심, 전문성, 혁신, 소통, 성장...)"
              className="keyword-input"
            />
            <button
              onClick={handleSubmit}
              className={`submit-button ${buttonClicked ? 'clicked' : ''}`}
              disabled={!input.trim()}
            >
              등록하기
            </button>
          </div>
        </div>

        {/* 상태 메시지 영역 */}
        <div className="status-area">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {duplicateError && (
            <div className="duplicate-message">
              ⏱️ <strong>{lastKeyword}</strong> 키워드를 방금 등록하셨습니다. 잠시 후 다시 시도해주세요.
            </div>
          )}
        </div>

        {/* 워드 클라우드 영역 */}
        {loading && uniqueWords.length === 0 ? (
          <div className="loading">
            데이터를 불러오는 중입니다...
          </div>
        ) : sortedWords.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "4rem 2rem", 
            color: "#64748b",
            background: "rgba(255, 255, 255, 0.8)",
            borderRadius: "20px",
            margin: "2rem 0"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💡</div>
            <h3 style={{ color: "#475569", marginBottom: "0.5rem" }}>첫 번째 키워드를 등록해보세요!</h3>
            <p>병원의 미래를 함께 그려나갈 소중한 키워드를 기다리고 있습니다.</p>
          </div>
        ) : (
          <div className="wordcloud-container" style={{
            position: "relative", 
            height: containerHeight,
            marginTop: "2rem"
          }}>
            {sortedWords.map((word, index) => {
              const fontSize = calculateFontSize(word.value);
              const color = getWordColor(word.text);
              const fontWeight = word.value > 10 ? "700" : word.value > 5 ? "600" : "500";
              
              // 개선된 위치 배치 로직
              const getPosition = () => {
                if (word.value > 10) {
                  // 가장 큰 글자는 중앙 핵심 영역 (중앙 40% 영역)
                  return {
                    left: `${45 + Math.random() * 10}%`,
                    top: `${45 + Math.random() * 10}%`
                  };
                } else if (word.value > 5) {
                  // 중간 크기는 중간 링 영역
                  const angle = (Math.PI * 2 * index) / sortedWords.length + Math.random() * 0.5;
                  const distance = 20 + Math.random() * 10;
                  return {
                    left: `${50 + Math.cos(angle) * distance}%`,
                    top: `${50 + Math.sin(angle) * distance}%`
                  };
                } else if (word.value > 2) {
                  // 중간-작은 크기는 외곽 링 영역
                  const angle = (Math.PI * 2 * index) / sortedWords.length + Math.random() * 0.8;
                  const distance = 30 + Math.random() * 15;
                  return {
                    left: `${50 + Math.cos(angle) * distance}%`,
                    top: `${50 + Math.sin(angle) * distance}%`
                  };
                } else {
                  // 작은 글자는 가장 외곽 영역
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 35 + Math.random() * 20;
                  return {
                    left: `${Math.max(5, Math.min(95, 50 + Math.cos(angle) * distance))}%`,
                    top: `${Math.max(5, Math.min(95, 50 + Math.sin(angle) * distance))}%`
                  };
                }
              };
              
              const position = getPosition();
              
              return (
                <div 
                  key={word.id || word.text} 
                  className="word-hover-effect"
                  style={{
                    position: "absolute", 
                    left: position.left, 
                    top: position.top,
                    transform: `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 15}deg)`,
                    fontSize: `${fontSize}px`, 
                    color, 
                    fontWeight,
                    opacity: word.completed ? 0.6 : 1,
                    textDecoration: word.completed ? "line-through" : "none",
                    textShadow: word.important 
                      ? `0 0 8px ${color}, 2px 2px 4px rgba(0,0,0,0.2)` 
                      : "2px 2px 4px rgba(0,0,0,0.1)",
                    borderBottom: word.important ? `3px solid ${color}` : "none",
                    userSelect: "none", 
                    whiteSpace: "nowrap",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: Math.floor(word.value * 5),
                    animation: `fadeInScale 0.6s ease-out ${index * 0.1}s both, gentleFloat ${4 + Math.random() * 2}s ease-in-out infinite`,
                    cursor: "pointer",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "8px",
                    background: word.important 
                      ? `linear-gradient(135deg, ${color}15, ${color}08)` 
                      : "transparent"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translate(-50%, -50%) scale(1.15) rotate(0deg)";
                    e.target.style.zIndex = "1000";
                    e.target.style.textShadow = `0 0 15px ${color}, 0 0 25px ${color}40`;
                    e.target.style.background = `linear-gradient(135deg, ${color}20, ${color}10)`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = `translate(-50%, -50%) rotate(${(Math.random() - 0.5) * 15}deg)`;
                    e.target.style.zIndex = Math.floor(word.value * 5);
                    e.target.style.textShadow = word.important 
                      ? `0 0 8px ${color}, 2px 2px 4px rgba(0,0,0,0.2)` 
                      : "2px 2px 4px rgba(0,0,0,0.1)";
                    e.target.style.background = word.important 
                      ? `linear-gradient(135deg, ${color}15, ${color}08)` 
                      : "transparent";
                  }}
                  title={`${word.text} (${word.value}회 언급)${word.important ? ' - 중요 키워드' : ''}${word.completed ? ' - 완료됨' : ''}`}
                >
                  {word.text}
                </div>
              );
            })}
            
            {/* 통계 정보 */}
            <div className="counter-area" style={{
              position: "absolute", 
              bottom: "20px", 
              left: "0", 
              right: "0",
              textAlign: "center"
            }}>
              📊 총 <strong>{uniqueWords.length}개</strong>의 키워드가 등록되었습니다
              {sortedWords.length > 0 && (
                <span style={{ marginLeft: "1rem", opacity: 0.8 }}>
                  (상위 {sortedWords.length}개 표시)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 관리자용 키워드 관리 영역 */}
        {isAdmin && (
          <div style={{ marginTop: "3rem" }}>
            <KeywordManager words={words} isAdmin={isAdmin} />
          </div>
        )}
      </div>

      {/* 개선된 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3) rotate(180deg);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
        }
        
        @keyframes gentleFloat {
          0%, 100% { 
            transform: translate(-50%, -50%) translateY(0px) rotate(0deg); 
          }
          25% { 
            transform: translate(-50%, -50%) translateY(-3px) rotate(1deg); 
          }
          75% { 
            transform: translate(-50%, -50%) translateY(3px) rotate(-1deg); 
          }
        }

        .submit-button.clicked {
          transform: scale(0.95);
          box-shadow: 
            0 2px 8px rgba(30, 64, 175, 0.6),
            inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .submit-button:disabled {
          background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .submit-button:disabled:hover {
          transform: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}

export default KeywordCloud;