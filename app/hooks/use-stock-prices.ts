"use client";

import { type Dispatch, type SetStateAction, useCallback } from "react";
import { type Settings, type Stock } from "../finance/model";

export function useStockPrices(
  setStocks: Dispatch<SetStateAction<Stock[]>>,
  settings: Settings,
  showNotice: (message: string) => void,
) {
  const fetchLivePrices = useCallback(() => {
    if (settings.priceMode === "demo") {
      setStocks((items) => items.map((item, index) => ({
        ...item,
        currentPrice: Math.round(item.currentPrice * (1 + (index % 2 === 0 ? 0.004 : -0.002))),
        priceSource: "demo",
        updatedAt: "방금 데모 갱신",
      })));
      showNotice("데모 가격을 새로 불러왔어요");
      return;
    }
    showNotice("각 종목의 ‘가격 수정’을 눌러 입력해 주세요");
  }, [settings.priceMode, setStocks, showNotice]);

  return { fetchLivePrices, loadingPrices: false };
}
