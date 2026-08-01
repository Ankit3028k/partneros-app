import { Result, createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'DocProvider' });

type DocEntry = { keywords: string[]; answer: string };

const DOCS: DocEntry[] = [
  {
    keywords: ['react', 'usestate', 'hook'],
    answer: 'useState is a React Hook that lets you add state to functional components. Syntax: const [state, setState] = useState(initialValue). Never call hooks inside loops, conditions, or nested functions — only at the top level of your component.',
  },
  {
    keywords: ['react', 'useeffect', 'hook'],
    answer: 'useEffect is a React Hook for side effects in functional components. Syntax: useEffect(() => { /* effect */ }, [dependencies]). Return a cleanup function to prevent memory leaks. The dependency array controls when the effect re-runs.',
  },
  {
    keywords: ['react', 'usememo', 'hook'],
    answer: 'useMemo memoizes expensive computations. Syntax: const memoizedValue = useMemo(() => compute(a, b), [a, b]). Only recomputes when dependencies change. Use for expensive calculations, not for every value.',
  },
  {
    keywords: ['react', 'usecallback', 'hook'],
    answer: 'useCallback memoizes functions to prevent unnecessary re-renders. Syntax: const memoizedFn = useCallback(() => { doSomething(a, b); }, [a, b]). Returns the same function reference if dependencies haven\'t changed.',
  },
  {
    keywords: ['react', 'usecontext', 'hook', 'context'],
    answer: 'useContext lets you read context values without nesting. Syntax: const value = useContext(MyContext). Create context with createContext(), provide with <MyContext.Provider value={...}>. Avoid overusing — too many contexts cause fragmentation.',
  },
  {
    keywords: ['react', 'useref', 'ref', 'reference'],
    answer: 'useRef creates a mutable reference that persists across renders. Syntax: const ref = useRef(initialValue). Access via ref.current. Does NOT cause re-render when changed. Common uses: DOM element references, storing previous values, interval IDs.',
  },
  {
    keywords: ['react', 'usereducer', 'reducer'],
    answer: 'useReducer is for complex state logic. Syntax: const [state, dispatch] = useReducer(reducer, initialState). The reducer is a pure function: (state, action) => newState. dispatch sends actions. Best for state with multiple sub-values.',
  },
  {
    keywords: ['react', 'custom', 'hook'],
    answer: 'Custom Hooks let you extract component logic into reusable functions. Name must start with "use". Can call other hooks. Share logic, not state. Example: function useWindowSize() { const [size, setSize] = useState(...); useEffect(...); return size; }',
  },
  {
    keywords: ['react', 'native', 'flatlist', 'list'],
    answer: 'FlatList is React Native\'s performant list component. Props: data, renderItem, keyExtractor. Supports: pull-to-refresh (onRefresh), infinite scroll (onEndReached), item separation (ItemSeparatorComponent). Use getItemLayout for fixed-size items. Avoid inline functions in renderItem.',
  },
  {
    keywords: ['react', 'native', 'navigation', 'navigate'],
    answer: 'React Navigation is the standard navigation library for React Native. Install: @react-navigation/native + @react-navigation/native-stack. Wrap app in NavigationContainer. Define screens with createNativeStackNavigator(). Use navigation.navigate(\'ScreenName\') to move between screens.',
  },
  {
    keywords: ['typescript', 'interface', 'type'],
    answer: 'Use interface for object shapes that can be extended. Use type for unions, intersections, or primitives. Interface: interface User { name: string; age: number }. Type: type Status = \'active\' | \'inactive\'. Prefer interface for public APIs (better error messages, merges).',
  },
  {
    keywords: ['typescript', 'generic', 'generics'],
    answer: 'Generics create reusable components. Syntax: function identity<T>(arg: T): T { return arg; }. Constrain with extends: <T extends HasLength>. Common generics: Array<T>, Promise<T>, Record<K, V>. Use multiple type params: <K, V> for maps.',
  },
  {
    keywords: ['typescript', 'utility', 'type', 'pick', 'omit', 'partial', 'required'],
    answer: 'Common utility types: Partial<T> makes all props optional; Required<T> makes all required; Pick<T, K> selects keys; Omit<T, K> removes keys; Record<K, V> creates object type; Readonly<T> makes all readonly; Exclude<T, U> removes types from union.',
  },
  {
    keywords: ['javascript', 'promise', 'async', 'await'],
    answer: 'Promises handle async operations. Three states: pending, fulfilled, rejected. async/await is syntactic sugar: async function fetchData() { try { const res = await fetch(url); return await res.json(); } catch (err) { handleError(err); } }. Always use try/catch with await.',
  },
  {
    keywords: ['javascript', 'closure', 'scope'],
    answer: 'A closure is a function that remembers its lexical scope even when executed outside it. Example: function makeCounter() { let count = 0; return () => ++count; }. Each call to makeCounter() creates a new closure with its own count variable.',
  },
  {
    keywords: ['node', 'event', 'loop'],
    answer: 'Node.js Event Loop: 1. timers (setTimeout/setInterval), 2. pending callbacks (I/O), 3. idle/prepare, 4. poll (wait for I/O), 5. check (setImmediate), 6. close callbacks. process.nextTick runs before next phase. Microtasks (Promise.then) run between each phase.',
  },
  {
    keywords: ['react', 'native', 'style', 'stylesheet'],
    answer: 'Use StyleSheet.create() for styles in React Native. Syntax: const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } }). Access: style={styles.container}. Flexbox default. No CSS inheritance. Use platform-specific extensions: .ios.tsx, .android.tsx.',
  },
  {
    keywords: ['react', 'native', 'mmkv', 'storage'],
    answer: 'react-native-mmkv is a fast key-value storage. Install: react-native-mmkv. Use: const storage = new MMKV({ id: \'app\' }); storage.set(\'key\', \'value\'); const val = storage.getString(\'key\');. Much faster than AsyncStorage. Synchronous API.',
  },
  {
    keywords: ['sqlite', 'database', 'query'],
    answer: 'SQLite is an embedded SQL database engine. CRUD: INSERT INTO table (cols) VALUES (vals); SELECT * FROM table WHERE cond; UPDATE table SET col=val WHERE cond; DELETE FROM table WHERE cond. Use parameterized queries to prevent SQL injection. Transactions for atomicity.',
  },
  {
    keywords: ['zustand', 'state', 'management'],
    answer: 'Zustand is a minimal state management library. Syntax: const useStore = create((set) => ({ count: 0, increment: () => set((state) => ({ count: state.count + 1 })) })). Access: const count = useStore((s) => s.count). No providers needed. Supports middleware (persist, devtools).',
  },
  {
    keywords: ['git', 'commit', 'branch', 'merge'],
    answer: 'Git workflow: git checkout -b feature/new-thing (create branch), git add . && git commit -m "msg" (commit), git push origin feature/new-thing (push), create PR on GitHub, merge to main. Keep commits small. Write descriptive messages: "feat: add login screen" not "fix stuff".',
  },
];

export class DocumentationProvider {
  readonly name = 'Documentation';

  async query(text: string): Promise<Result<string | null>> {
    try {
      const query = text.toLowerCase();
      const matches = DOCS
        .map((entry) => ({
          entry,
          score: entry.keywords.filter((kw) => query.includes(kw)).length,
        }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score);

      if (matches.length === 0) return Result.ok(null);

      const best = matches[0];
      logger.debug('Doc matched', { query: text.substring(0, 50), keywords: best.entry.keywords.join(',') });
      return Result.ok(best.entry.answer);
    } catch (error) {
      return Result.err(error as Error);
    }
  }

  async findRelevant(query: string, limit = 3): Promise<Array<{ topic: string; answer: string; score: number }>> {
    const q = query.toLowerCase();
    return DOCS
      .map((entry) => ({
        topic: entry.keywords[0],
        answer: entry.answer,
        score: entry.keywords.filter((kw) => q.includes(kw)).length,
      }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
