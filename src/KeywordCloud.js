// KeywordCloud.js - ESLint 경고 비활성화 주석 추가
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
  // eslint-disable-next-line no-unused-vars
  onSnapshot,
  serverTimestamp,
  // eslint-disable-next-line no-unused-vars
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

  const colorPalette = useMemo(() => [
    "#0057A8", "#76B82A", "#FF8300", "#222222", "#1E88E5", 
    "#43A047", "#E53935", "#FB8C00", "#8E24AA", "#00ACC1", 
    "#7CB342", "#FFB300", "#5E35B1", "#00897B", "#C0CA33", 
    "#F4511E", "#039BE5", "#D81B60", "#6D4C41", "#546E7A"
  ], []);

  // 창 크기 변경 감지
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
          
          // 객체를 배열로 변환 (모든 필드 포함)
          const keywordList = Object.entries(data).map(([id, val]) => ({
            id,
            text: val.text,
            value: val.value || 1,
            important: val.important || false,
            completed: val.completed || false,
            createdAt: val.createdAt || "",
            updatedAt: val.updatedAt || ""
          }));
          
          // 기존 데이터와 병합 (값이 줄어들지 않도록)
          setWords(prevWords => {
            const wordMap = new Map();
            
            // 기존 데이터 먼저 맵에 추가
            prevWords.forEach(word => {
              const key = word.id || word.text;
              wordMap.set(key, word);
            });
            
            // 새 데이터로 맵 업데이트 (값이 더 큰 경우에만)
            keywordList.forEach(newWord => {
              const key = newWord.id || newWord.text;
              const existingWord = wordMap.get(key);
              
              if (!existingWord) {
                // 새 단어면 그대로 추가
                wordMap.set(key, newWord);
              } else {
                // 기존 단어면 값, 상태 등 업데이트
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
            
            // 맵을 배열로 변환하여 반환
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

  // 키워드 제출 함수
  const handleSubmit = useCallback(async () => {
    const keyword = input.trim();
    if (!keyword) return;
    const currentTime = new Date().getTime();
    if (keyword === lastKeyword && currentTime - lastKeywordTime < 10000) {
      setDuplicateError(true);
      setTimeout(() => setDuplicateError(false), 3000);
      return;
    }

    // 버튼 클릭 효과 강화
    setButtonClicked(true);
    setTimeout(() => setButtonClicked(false), 300);

    try {
      // 로컬 UI 즉시 업데이트 (Firebase 응답 전)
      setWords(prev => {
        // 기존 단어를 찾습니다
        const found = prev.find(w => w.text === keyword);
        if (found) {
          // 기존 단어가 있으면 값을 증가시킵니다
          return prev.map(w => w.text === keyword ? {...w, value: w.value + 1} : w);
        } else {
          // 새 단어를 추가합니다
          return [...prev, {text: keyword, value: 1}];
        }
      });

      // 입력창 비우기 (즉시 응답성 향상)
      setInput("");
      setLastKeyword(keyword);
      setLastKeywordTime(currentTime);

      // 현재 시간을 ISO 문자열 형식으로 생성
      const now = new Date().toISOString();

      // 키워드를 소문자로 변환하고 공백을 하이픈으로 대체하여 고유 키로 사용
      const keyId = keyword.toLowerCase().replace(/\s+/g, '-');
      
      // Realtime Database에 저장
      const keywordRef = ref(database, `keywords/${keyId}`);
      
      console.log("키워드 저장 시도:", keyword);
      
      // 해당 키워드가 이미 있는지 확인
      const snapshot = await get(keywordRef);
      
      if (snapshot.exists()) {
        // 기존 키워드면 값 증가
        const currentValue = snapshot.val().value || 0;
        const isCompleted = snapshot.val().completed || false;
        const isImportant = snapshot.val().important || false;
        
        console.log("기존 키워드 업데이트:", {
          text: keyword,
          value: currentValue + 1,
          updatedAt: now,
          completed: isCompleted,
          important: isImportant
        });
        
        await update(keywordRef, {
          text: keyword,
          value: currentValue + 1,
          updatedAt: now,  // ISO 문자열 형식으로 저장
          completed: isCompleted,  // 기존 값 유지
          important: isImportant   // 기존 값 유지
        });
      } else {
        // 새 키워드면 생성
        console.log("새 키워드 생성:", {
          text: keyword,
          value: 1,
          createdAt: now,
          updatedAt: now,
          completed: false,
          important: false
        });
        
        await set(keywordRef, {
          text: keyword,
          value: 1,
          createdAt: now,  // ISO 문자열 형식으로 저장
          updatedAt: now,  // ISO 문자열 형식으로 저장
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

  // 1~10회 등록 시 점진적으로 커지는 폰트 크기 함수
  const calculateFontSize = useCallback((value) => {
    const minSize = 12; // 1회 등록 시 최소 크기
    const maxSize = 50; // 10회 등록 시 최대 크기
    
    // 1~10회 범위 내에서 점진적으로 증가
    if (value <= 10) {
      // 균일한 증가 (선형 증가 - 매 번 동일한 비율로 커짐)
      return minSize + ((value - 1) / 9) * (maxSize - minSize);
    } else {
      // 10회 초과는 최대 크기로 고정
      return maxSize;
    }
  }, []);

  const containerHeight = useMemo(() => {
    if (windowSize.width < 576) return 400;
    if (windowSize.width < 992) return 500;
    return 600;
  }, [windowSize.width]);

  const maxWords = useMemo(() => {
    if (windowSize.width < 576) return 50;
    if (windowSize.width < 992) return 75;
    return 100;
  }, [windowSize.width]);

  const getWordColor = useCallback((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorPalette[Math.abs(hash) % colorPalette.length];
  }, [colorPalette]);

  const positions = useMemo(() => {
    const positions = [];
    const totalWords = Math.min(words.length, maxWords);
    const gridSize = Math.max(6, Math.ceil(Math.sqrt(totalWords * 1.5)));
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = 10 + (col * 80 / gridSize);
        const y = 10 + (row * 80 / gridSize);
        const jitterX = (Math.random() - 0.5) * 15;
        const jitterY = (Math.random() - 0.5) * 15;
        positions.push({
          left: `${Math.max(5, Math.min(95, x + jitterX))}%`,
          top: `${Math.max(5, Math.min(95, y + jitterY))}%`
        });
        if (positions.length >= totalWords) break;
      }
      if (positions.length >= totalWords) break;
    }
    return positions;
  }, [words.length, maxWords]);

  const uniqueWords = useMemo(() => {
    return Array.from(new Map(words.map(item => [item.text, item])).values());
  }, [words]);

  const sortedWords = useMemo(() => {
    return [...uniqueWords]
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords);
  }, [uniqueWords, maxWords]);

  return (
    <div style={{
      maxWidth: windowSize.width < 768 ? "100%" : "900px",
      margin: "30px auto",
      padding: windowSize.width < 576 ? "1rem" : "2rem",
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>
      {/* 관리자 로그인 영역 */}
      <AdminLogin isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
        <img src={hospitalLogo} alt="광주365재활병원 로고" style={{
          height: windowSize.width < 576 ? "60px" : "80px",
          marginBottom: "15px"
        }}/>
        <h2 style={{
          fontSize: windowSize.width < 576 ? "1.3rem" : "1.6rem",
          color: "#0057A8",
          fontWeight: "700",
          margin: "0.5rem 0",
          textAlign: "center"
        }}>광주365재활병원 직원이 바라보는 앞으로의 핵심 키워드</h2>
        <p style={{ textAlign: "center", color: "#666", fontSize: windowSize.width < 576 ? "0.85rem" : "0.95rem" }}>
          본원이 지향하는 미래에 대한 키워드들을 선정하여 인포그래픽으로 도식화하여 소개
        </p>
      </div>

      {/* 입력창 및 버튼 - 클릭 효과 강화 */}
      <div style={{
        display: "flex", gap: "0.5rem", marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem auto"
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="키워드를 입력해주세요 (예: 환자중심, 전문성, 혁신...)"
          style={{
            flex: 1, 
            padding: "0.75rem 1rem", 
            fontSize: "1rem",
            border: "1px solid #ddd", 
            borderRadius: "8px",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)"
          }}
        />
        <button
          onClick={handleSubmit}
          onMouseDown={() => setButtonClicked(true)}
          onMouseUp={() => setButtonClicked(false)}
          onMouseLeave={() => buttonClicked && setButtonClicked(false)}
          style={{
            padding: "0.75rem 1.5rem", 
            fontSize: "1rem",
            backgroundColor: buttonClicked ? "#00438A" : "#0057A8", // 클릭 시 더 어두운 색상
            color: "#fff", 
            border: "none", 
            borderRadius: "8px", 
            cursor: "pointer",
            fontWeight: "500",
            boxShadow: buttonClicked 
              ? "0 1px 2px rgba(0, 87, 168, 0.5), inset 0 1px 3px rgba(0,0,0,0.2)" // 클릭 시 내부 그림자
              : "0 2px 4px rgba(0, 87, 168, 0.3)",
            transform: buttonClicked ? "translateY(2px) scale(0.98)" : "translateY(0) scale(1)", // 클릭 시 약간 아래로 이동 및 축소
            transition: "all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)" // 부드러운 효과
          }}
        >등록</button>
      </div>

      {/* 에러 메시지 */}
      {error && <div style={{
        color: "#f44336", textAlign: "center", padding: "0.5rem",
        backgroundColor: "rgba(244, 67, 54, 0.1)", borderRadius: "4px"
      }}>{error}</div>}

      {duplicateError && <div style={{
        color: "#ff9800", textAlign: "center", padding: "0.5rem",
        backgroundColor: "rgba(255, 152, 0, 0.1)", borderRadius: "4px"
      }}>
        <b>{lastKeyword}</b> 키워드를 방금 등록하셨습니다. 잠시 후 다시 시도해주세요.
      </div>}

      {/* 워드 클라우드 */}
      {loading && uniqueWords.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#666" }}>
          데이터 로딩 중...
        </div>
      ) : sortedWords.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#666" }}>
          등록된 키워드가 없습니다. 첫 번째 키워드를 입력해보세요!
        </div>
      ) : (
        <div style={{
          position: "relative", height: containerHeight,
          marginTop: "1rem", backgroundColor: "#f9f9f9",
          borderRadius: "12px", overflow: "hidden", border: "1px solid #f0f0f0"
        }}>
          {sortedWords.map((word, index) => {
            const position = positions[index % positions.length];
            const fontSize = calculateFontSize(word.value);
            const color = getWordColor(word.text);
            
            // 언급 횟수에 따른 글자 굵기 조정
            const fontWeight = word.value > 7 ? "700" : word.value > 3 ? "600" : "500";
            
            return (
              <div key={word.id || word.text} style={{
                position: "absolute", 
                left: position.left, 
                top: position.top,
                transform: `translate(-50%, -50%) rotate(${Math.floor(Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1)}deg)`,
                fontSize: `${fontSize}px`, 
                color, 
                fontWeight,
                opacity: word.completed ? 0.7 : 0.9, // 완료된 키워드는 흐리게
                textDecoration: word.completed ? "line-through" : "none", // 완료된 키워드는 취소선
                textShadow: word.important ? `0 0 5px ${color}` : "1px 1px 1px rgba(0,0,0,0.05)", // 중요 키워드는 그림자 효과
                borderBottom: word.important ? `2px solid ${color}` : "none", // 중요 키워드는 밑줄
                userSelect: "none", 
                whiteSpace: "nowrap",
                transition: "all 0.3s ease", // 부드러운 크기 변경
                zIndex: Math.floor(word.value * 10),
                animation: `fadeIn 0.5s ease-out both` // 부드러운 등장 애니메이션
              }} title={`${word.text} (${word.value}회 언급)${word.important ? ' - 중요' : ''}${word.completed ? ' - 완료됨' : ''}`}>
                {word.text}
              </div>
            );
          })}
          <div style={{
            position: "absolute", bottom: "15px", left: "0", right: "0",
            textAlign: "center", fontSize: "0.85rem", color: "#888",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            padding: "5px 0"
          }}>
            총 {uniqueWords.length}개의 키워드가 등록되었습니다
          </div>
        </div>
      )}
      {/* 관리자용 키워드 관리 영역 */}
      <KeywordManager words={words} isAdmin={isAdmin} />
      {/* 애니메이션 스타일 정의 */}
      <style>
        {`
          @keyframes fadeIn {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            100% {
              opacity: 0.9;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}

export default KeywordCloud;