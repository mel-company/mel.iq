import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError, reloadForNewBuild } from "../utils/staleBuild";

type Props = { children: ReactNode; resetKey: string };
type State = { error: Error | null };

/**
 * Keeps a page that fails to load or render from blanking the whole app.
 * A stale chunk after a deploy reloads the page; anything else shows a
 * message with a reload button. Navigating elsewhere clears the error.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page failed to render", error, info.componentStack);
    if (isChunkLoadError(error)) reloadForNewBuild();
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-black"
      >
        <div className="max-w-md space-y-5 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            تعذّر فتح الصفحة
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            ربما تم تحديث الموقع للتو. أعد تحميل الصفحة للمتابعة.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow transition hover:bg-violet-700"
            >
              إعادة تحميل الصفحة
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              الصفحة الرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }
}
