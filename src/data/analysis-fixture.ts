import type { Issue, OverallSignal } from "@/types";

export interface AnalysisFixture {
  stocks: Record<string, { issues: Issue[]; overall: OverallSignal }>;
  overalls: { current: OverallSignal; spare: OverallSignal };
}

/**
 * Frozen analysis output served when USE_FIXTURE is true. Starts as null —
 * populate it once via the capture flow documented in
 * src/lib/feature-flags.ts. While this is null, fixture mode still works but
 * every card falls back to mock data (no OpenAI call, no real data either).
 */
export const ANALYSIS_FIXTURE: AnalysisFixture | null = {
  "stocks": {
    "마이크론 테크놀로지": {
      "issues": [
        {
          "text": "AI 서버용 256GB 고속 메모리 공개",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "주가 연초 대비 154% 급등",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "2026년 HBM4 공급량 이미 마감",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "기록적 실적 기대감에도 차익실현 압력",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "사상 최고가 이후 주가 6.6% 하락",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "메모리 공급 과열 후 자연스러운 조정",
          "signal": "negative",
          "intensity": "mild"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "ASML 홀딩(ADR)": {
      "issues": [
        {
          "text": "AI 인프라 수요 급증, 실적 기대 상향",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "2026년 매출 전망 상향, 배당금 17% 인상",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "분기 실적 기대치 상회, 가이던스 강화",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "5월15일 지정학 리스크로 주가 약세",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "중국 수출 규제 우려로 주가 조정",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "엔비디아": {
      "issues": [
        {
          "text": "AI 자율주행 핵심 플랫폼 확산 시도",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "시총 독일 GDP 초과하는 역사적 고점",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "Intel과 협업, CPU·GPU 통합 제품 개발",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "Corning 지분 5억 달러 규모 투자 체결",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "S&P500·나스닥 최고치 견인",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "RTX 5090 최대 300달러 가격 인상 가능성",
          "signal": "negative",
          "intensity": "mid"
        },
        {
          "text": "중국 메모리 부족으로 공급 제약 우려",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "strong"
      }
    },
    "블룸에너지": {
      "issues": [
        {
          "text": "1분기 매출 130% 폭증 기록",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "Oracle과 최대 2.8GW 계약 확대",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "Brookfield·Federal Pacific 대규모 인프라 계약",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "AI·우주용 연료전지 NASA 테스트 확대",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "주가 52주 최고가 경신",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "밸류에이션 과도, 고평가 우려 존재",
          "signal": "negative",
          "intensity": "mild"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "비스트라 에너지": {
      "issues": [
        {
          "text": "1분기 실적, EPS·매출 모두 예상 상회",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "배당 매력 및 애널리스트 관심 증가",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "4.5GW 신규 발전 용량 확장 계획 발표",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "Jefferies 목표주가 하향하지만 매수 유지",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "1분기 실적과 이전 기대 간 괴리로 혼선",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "일부 기관, 지분 대폭 축소",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "neutral",
        "intensity": "mid"
      }
    },
    "TSMC(ADR)": {
      "issues": [
        {
          "text": "AMD 강한 실적으로 ADR·펩 상승 견인",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "AI 수요 강세로 2026년 매출·가이던스 상향",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "VIS 지분 152M주 블록 매각 추진",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "SOX 약세로 TSMC ADR 2% 하락",
          "signal": "negative",
          "intensity": "mild"
        }
      ],
      "overall": {
        "signal": "neutral",
        "intensity": "mid"
      }
    },
    "브로드컴": {
      "issues": [
        {
          "text": "메타와 AI 가속기 다년 파트너십 확장",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "구글 TPU 앤스로픽 공급 확대 계획 발표",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "Q1 매출·AI 매출 기록적 성장·자사주 100억 달러 환원",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "UBS, 브로드컴 목표주가 490달러 상향",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "구글 클라우드와 네트워크 관측 협업 확대",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "앤스로픽 실적 기대 하향 및 AI 기여도 재조정",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "유럽에서 VMware 라이선싱 관련 반독점 제기",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "strong"
      }
    },
    "버티브 홀딩스": {
      "issues": [
        {
          "text": "AI 데이터센터용 액체 냉각 기술 확보",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "1분기 매출·현금 흐름 크게 증가",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "제네레이트와 전원·냉각 인프라 협업",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "제조시설 4곳 확장으로 생산능력 확대",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "투자자 대상 이틀간 콘퍼런스 개최",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "소액공개매수 거절 권고로 주주 보호",
          "signal": "neutral",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "삼성전자": {
      "issues": [
        {
          "text": "1분기 역대 최고 매출·영업익 기록",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "AI 수요 증가로 메모리 수익성 증대",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "AI 기반 FWA 기술 세계 최초 검증 성공",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "TV 신규 라인업 ‘Micro RGB’ 발표",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "주가 5% 이상 급락, 파업 리스크 반영",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "노사 임금협상 사후조정 결렬",
          "signal": "negative",
          "intensity": "mid"
        },
        {
          "text": "법원, 쟁의 제한 일부 인용…리스크 여전",
          "signal": "negative",
          "intensity": "mid"
        },
        {
          "text": "반도체 생산 일부 조정, 손실 우려 확대",
          "signal": "negative",
          "intensity": "mid"
        },
        {
          "text": "노조와의 본교섭 결렬, 파업 임박 우려",
          "signal": "negative",
          "intensity": "strong"
        }
      ],
      "overall": {
        "signal": "negative",
        "intensity": "mid"
      }
    },
    "SK하이닉스": {
      "issues": [
        {
          "text": "인텔 EMIB 기반 HBM 패키징 R&D 보도",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "글로벌 IT 기업의 장비·라인 투자 제안 쇄도",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "코스피 · SK하이닉스 역사적 신고가 경신",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "초호황 실적 기록, 주주환원 확대 계획 언급",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "AI 향 메모리 수요 급증…공급 부족 지속 경고",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "“설비 수용도 제로” 제안 쇄도에도 수용 신중",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "‘시민 배당’ 논란으로 시장 다소 불안",
          "signal": "negative",
          "intensity": "mild"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "아마존": {
      "issues": [
        {
          "text": "AWS Q1 매출 28% 고성장",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "AWS AI 수요에 맞춘 강한 클라우드 성장",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "내부 물류 네트워크 상업화로 경쟁력 확대",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "연간 2천억달러 CAPEX로 미래 투자 강화",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "고유류가 반영한 FBA 운임 부과로 비용 부담",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "주가, 기술 랠리에도 1.1% 하락",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "AWS VA 데이터센터 과열로 장애 발생",
          "signal": "negative",
          "intensity": "mid"
        },
        {
          "text": "높은 CAPEX로 현금흐름 단기 위축 우려",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "neutral",
        "intensity": "mid"
      }
    },
    "팔란티어": {
      "issues": [
        {
          "text": "AI 수요 견인해 분기 매출 85% 증가",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "미 가동부문 104% 성장, 연간 가이던스 상향",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "미 정부 매출 84%↑, Piper Sandler ‘Overweight’ 유지",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "매출 확대·영업이익 개선으로 수익성 강화",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "매출 기대치 이미 주가에 반영된 듯 회복 더뎨",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "밸류에이션 부담으로 투자심리 제약",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "주가, 강력 실적에도 ‘Sell the News’ 급락",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "일라이 릴리": {
      "issues": [
        {
          "text": "분기 실적 55% 증가, EPS 가이던스 상향",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "Foundayo FDA 승인, 경구 GLP‑1 혁신",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "인디애나 제조시설에 추가 45억 달러 투자",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "AI 관련 시장 조정에도 주가 강세",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "150주년 기념, 리스크 아닌 성장 자신감 표출",
          "signal": "neutral",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "strong"
      }
    },
    "아스테라 랩스": {
      "issues": [
        {
          "text": "분기 매출 14% QoQ·93% YoY 기록",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "Scorpio X‑Series 320레인 AI 패브릭 스위치 출하 개시",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "PCIe Gen6 매출 비중 1/3 넘어 채택 확대",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "Q2 매출 가이던스 355~365M달러 제시",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "비용 투자 지속하며 이익률도 함께 상승",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "순현금 및 유가증권 보유 10억달러 이상",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "기존 고객 의존·R&D 부담 지속 리스크",
          "signal": "negative",
          "intensity": "mild"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "콴타 서비시스": {
      "issues": [
        {
          "text": "사상 최대 백로그 485억 달러 기록",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "1분기 매출·조정 EPS 크게 상회",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "2026년 연간 가이던스 상향",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "데이터센터용 제조능력 확대 계획",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "리더십에 성과주식단위 인센티브 부여",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "기후·공급망 등 리스크 여전",
          "signal": "negative",
          "intensity": "mild"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    },
    "크라우드스트라이크 홀딩스": {
      "issues": [
        {
          "text": "자사주 매입 한도 15억 달러로 확대",
          "signal": "positive",
          "intensity": "strong"
        },
        {
          "text": "신규 모바일 앱 ‘젯’ 출시로 파트너 편의 강화",
          "signal": "positive",
          "intensity": "mid"
        },
        {
          "text": "주가 1개월간 40% 가까이 급등",
          "signal": "positive",
          "intensity": "mild"
        },
        {
          "text": "AI 보안 수요 증가로 애널리스트 관심도 개선",
          "signal": "neutral",
          "intensity": "mid"
        },
        {
          "text": "CFO, 내부자 보유자산 처분 위해 주식 일부 매도",
          "signal": "negative",
          "intensity": "mild"
        },
        {
          "text": "공격자 AI 활용해 네트워크 침투 속도 크게 증가",
          "signal": "negative",
          "intensity": "mid"
        }
      ],
      "overall": {
        "signal": "positive",
        "intensity": "mid"
      }
    }
  },
  "overalls": {
    "current": {
      "signal": "positive",
      "intensity": "strong"
    },
    "spare": {
      "signal": "positive",
      "intensity": "mid"
    }
  }
};

// Step 4a-3 / 4b: enrich every issue with deterministic mock metadata so
// fixture mode exercises the same fields the live GPT path now returns.
//   - createdAt: base = 2026-05-26 15:00 KST (06:00 UTC). Each stock starts 4h
//     earlier than the previous; each issue within a stock is 31 min earlier
//     than the previous. Distributes ~102 issues across ~3 days, realistic
//     enough for the modal preview without per-issue hand-typed times.
//   - importance: unique 1..N per stock (issues are already in rough priority
//     order), 1 = most important (Step 4b).
//   - source: a mock { name, url } cycled from a small pool (Step 4b). Data
//     only — not rendered, just keeps the field populated for fixture mode.
const MOCK_ISSUE_SOURCES = [
  "연합뉴스",
  "한국경제",
  "매일경제",
  "조선비즈",
  "Bloomberg",
  "Reuters",
  "CNBC",
  "The Verge",
];
if (ANALYSIS_FIXTURE) {
  const baseUtcMs = Date.UTC(2026, 4, 26, 6, 0, 0);
  Object.values(ANALYSIS_FIXTURE.stocks).forEach((stock, stockIdx) => {
    stock.issues.forEach((issue, issueIdx) => {
      const offsetMs = (stockIdx * 240 + issueIdx * 31) * 60 * 1000;
      issue.createdAt = new Date(baseUtcMs - offsetMs).toISOString();
      issue.importance = issueIdx + 1;
      const name =
        MOCK_ISSUE_SOURCES[(stockIdx + issueIdx) % MOCK_ISSUE_SOURCES.length];
      issue.source = { name, url: `https://news.example.com/${stockIdx}-${issueIdx}` };
    });
  });
}
