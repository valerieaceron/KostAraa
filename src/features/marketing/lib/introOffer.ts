import {useEffect, useState} from "react";
import {apiJson} from "../../costing/utils/api";

export const INTRODUCTORY_USER_LIMIT = 100;

export function useIntroOffer() {
  const [users, setUsers] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiJson("/api/public/user-count", {signal: controller.signal})
      .then(data => {
        const count = data?.result?.count;
        if (!controller.signal.aborted && Number.isSafeInteger(count) && count >= 0) setUsers(count);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return {
    users,
    full: users !== null && users >= INTRODUCTORY_USER_LIMIT,
    progress: users === null ? 0 : Math.min(100, users / INTRODUCTORY_USER_LIMIT * 100),
    remaining: users === null ? null : Math.max(0, INTRODUCTORY_USER_LIMIT - users),
  };
}
