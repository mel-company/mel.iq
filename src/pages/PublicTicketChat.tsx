import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from '../components/icons';
import { toast } from 'sonner';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://api.mel.iq/api/v1'
).replace(/\/+$/, '');

type PublicTicket = {
  reference: string;
  title: string | null;
  status: string;
  contactName: string | null;
};

type PublicMessage = {
  id: string;
  content: string;
  message: string;
  senderType: string;
  createdAt: string;
  fromSupport: boolean;
};

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      (Array.isArray(data?.message) ? data.message[0] : null) ||
      'تعذر إكمال الطلب';
    throw new Error(typeof message === 'string' ? message : 'تعذر إكمال الطلب');
  }
  return data as T;
}

const PublicTicketChat = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const [ticketData, messagesData] = await Promise.all([
        publicFetch<PublicTicket>(`/support-ticket/public/${token}`),
        publicFetch<{ data: PublicMessage[] }>(
          `/support-ticket/public/${token}/messages`,
        ),
      ]);
      setTicket(ticketData);
      setMessages(messagesData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'الرابط غير صالح');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const created = await publicFetch<PublicMessage>(
        `/support-ticket/public/${token}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: reply.trim() }),
        },
      );
      setMessages((current) => [...current, created]);
      setReply('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]" dir="rtl">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4" dir="rtl">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-slate-100">
          <h1 className="text-xl font-black text-slate-900">تعذر فتح المحادثة</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {error || 'الرابط غير صالح أو انتهت صلاحية التذكرة'}
          </p>
        </div>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED' || ticket.status === 'CANCELLED';

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fb]" dir="rtl">
      <header className="border-b border-slate-100 bg-white px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 text-right">
          <p className="text-xs font-bold text-violet-600">تواصل معنا — MEL</p>
          <h1 className="text-lg font-black text-slate-950 sm:text-xl">
            {ticket.title || 'محادثة الدعم'}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            أهلاً {ticket.contactName || 'بك'} · رقم المرجع{' '}
            <span dir="ltr">#{ticket.reference}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromSupport ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-7 ${
                  message.fromSupport
                    ? 'bg-violet-50 text-slate-800'
                    : 'bg-violet-600 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content || message.message}</p>
                <p
                  className={`mt-2 text-[10px] ${
                    message.fromSupport ? 'text-slate-400' : 'text-white/70'
                  }`}
                >
                  {message.fromSupport ? 'فريق الدعم' : 'أنت'} ·{' '}
                  {new Date(message.createdAt).toLocaleString('ar-IQ')}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {closed ? (
          <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-500">
            هذه التذكرة مغلقة — لا يمكن إرسال رسائل جديدة
          </p>
        ) : (
          <form onSubmit={handleSend} className="mt-4 flex gap-2">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white disabled:opacity-60"
            >
              إرسال
              <Send size={16} />
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default PublicTicketChat;
