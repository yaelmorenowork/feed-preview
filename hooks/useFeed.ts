import { useCallback, useEffect, useState } from "react";
import { Post } from "../data/post";
import { getPosts } from "../services/feedService";

interface UseFeedResult {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Single entry point for reading feed data in the UI.
 *
 * Components never import feedService (or any Notion service)
 * directly — they call useFeed() instead. Whether posts.length ends
 * up being mock data or real Notion pages is entirely decided inside
 * feedService.getPosts(); this hook only handles the loading/error
 * lifecycle around that call.
 */
export function useFeed(): UseFeedResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getPosts();
        if (!cancelled) {
          setPosts(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading your feed."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  return { posts, isLoading, error, retry };
}
