import { Icon } from '@impactium/icons'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Application } from '@/context/Application.context'
import { Doc } from '@/entities/Doc'
import { Operation } from '@/entities/Operation'
import { SmartSocket } from '@/class/SmartSocket'
import { Internal } from '@/entities/addon/Internal'
import { Markdown } from '@/ui/Markdown'
import { toast } from 'sonner'
import s from './styles/SnikerChatBanner.module.css'
import { cn } from '@impactium/utils'
import { GulpIndexedDB } from '@/class/IndexedDB'
import { generateUUID } from '@/ui/utils'


const api = (globalThis as any).api

// initialize indexed db and store if not already initialized
const chatDB = new GulpIndexedDB("gulp_DB", "gulp_ai_assistant_history");

export namespace AI {
  export interface Message {
    content: string;
    isGenerated: boolean;
  }

  /**
   * Represents a single request-response cycle in the AI chat.
   * Contains the ID of the request, the list of event IDs analyzed,
   * the user's prompt message, and the AI's generated response.
   */
  export interface AnalysisRequest {
    /** Unique identifier for the analysis request */
    id: string;
    eventIds: string[];
    userMessage: Message;
    aiMessage: Message;
  }

  export namespace Skiker {
    export namespace Panel {
      export interface Props {

      }
    }

    /**
     * Main component for the AI Assistant Chat Panel.
     * Handles checking indexedDB for history, sending analysis requests,
     * receiving streaming responses via WebSocket, and rendering the chat UI.
     */
    export function Panel({ onClose }: { onClose: () => void }) {
      const { Info } = Application.use()
      const [loading, setLoading] = useState<boolean>(false);
      // History of requests
      const [history, setHistory] = useState<AI.AnalysisRequest[]>([])
      const chatRef = useRef<HTMLDivElement>(null)
      const mounted = useRef(true)
      const operation = Operation.Entity.selected(Info.app);

      useEffect(() => {
        mounted.current = true
        
        // If no operation is selected, we cannot load history context, so clear it.
        if (!operation) {
          setHistory([]);
          return;
        }

        // Load chat history from IndexedDB for the current operation ID.
        if (operation) {
          chatDB.GetConfiguration(operation.id).then((saved) => {
            if (mounted.current) {
              if (saved){
                setHistory(saved);                
              }
              else{
                setHistory([])
              }
            }
          })
        }

        return () => {
          mounted.current = false
        }
      }, [operation?.id])

      useEffect(() => {
        if (operation && history.length > 0) {
            chatDB.UpdateConfiguration(history, operation.id);
        }
        
        // Scroll to bottom only on new requests, but here simplified to scroll on history update
        // We might want to be smarter about this if we are scrolling to specific element
        if (chatRef.current && loading) { // Only scroll to bottom if loading (new content coming in)
          chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
      }, [history, operation?.id]) // Added loading dependency implicitly by behavior

      /**
       * Updates the content of the AI message for the most recent analysis request.
       * Used during streaming validation to append incoming chunks of text.
       * 
       * @param content - The full content string to update the message with.
       */
      const updateLastRequestAIMessage = (content: string) => {
        setHistory(prev => {
          const newHistory = [...prev]
          const lastIndex = newHistory.length - 1
          if (lastIndex >= 0) {
             const lastRequest = { ...newHistory[lastIndex] }
             lastRequest.aiMessage = { ...lastRequest.aiMessage, content }
             newHistory[lastIndex] = lastRequest
          }
          return newHistory
        })
      }

      /**
       * Sends the retrieved logs to the backend to get an AI hint/analysis.
       * Sets up WebSocket listeners to handle the streaming response.
       * 
       * @param logs - The list of log documents to be analyzed.
       * @param requestId - The ID of the current analysis request.
       */
      const getHint = async (logs: any[], requestId: string) => {
        if (!operation) return;

        setLoading(true);

        await api('/get_ai_hint', {
          method: 'POST',
          query: {
            token: Internal.Settings.token,
            ws_id: Info.app.general.ws_id,
            operation_id: operation.id
          },
          body: logs,
          raw: true
        }, ({ req_id }: { req_id: string }) => {
          let content = '';

          const stream = SmartSocket.Class.instance.con("ai_assistant_stream" as SmartSocket.Message.Type, m => m.req_id === req_id, m => {
            if (!m.payload || !mounted.current) return;

            content += String(m.payload);
            updateLastRequestAIMessage(content)
          });

          const done = SmartSocket.Class.instance.conce("ai_assistant_done" as SmartSocket.Message.Type, m => m.req_id === req_id, () => {
            if (mounted.current) setLoading(false);
            SmartSocket.Class.instance.coff("ai_assistant_stream" as SmartSocket.Message.Type, stream);
            SmartSocket.Class.instance.coff("ai_assistant_error" as SmartSocket.Message.Type, error);
            
            if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight
            }
          });

          const error = SmartSocket.Class.instance.conce("ai_assistant_error" as SmartSocket.Message.Type, m => m.req_id === req_id, m => {
            if (mounted.current) setLoading(false);
            const errorMsg = String(m.payload as any) ?? 'Error during response generation';
            updateLastRequestAIMessage(errorMsg)

            SmartSocket.Class.instance.coff("ai_assistant_stream" as SmartSocket.Message.Type, stream);
            SmartSocket.Class.instance.coff("ai_assistant_done" as SmartSocket.Message.Type, done);
             if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight
            }
          });
        });
      }

      /**
       * Triggered when the user clicks "Analyze Flagged Events".
       * 1. Retrieves currently flagged event IDs.
       * 2. Checks if these exact events have already been analyzed to prevent duplicates.
       * 3. If duplicate, scrolls to the existing request.
       * 4. If new, creates a new request, updates state, and initiates the API call.
       */
      const analyze = async () => {
        const docIds = Doc.Entity.flag.getDocIds(Info.app);
        
        if (!docIds.length) {
            toast.info('No flagged events found to analyze.')
            return;
        }

        const sortedIds = [...docIds].sort().join(',');

        // Check for duplicates in history to avoid re-analyzing the same set of events.
        // We sort the IDs to ensure the comparison is order-independent.
        const existingRequest = history.find(req => {
            const reqIds = [...req.eventIds].sort().join(',');
            return reqIds === sortedIds;
        });

        if (existingRequest) {
            const element = document.getElementById(`request-${existingRequest.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Briefly highlight or flash? (Optional)
                toast.info('These events have already been analyzed. Scrolling to results.');
            }
            return;
        }

        const requestId = generateUUID() as string;
        const newRequest: AI.AnalysisRequest = {
            id: requestId,
            eventIds: docIds,
            userMessage: {
                content: `Analyze ${docIds.length} flagged events`,
                isGenerated: false
            },
            aiMessage: {
                content: '',
                isGenerated: true
            }
        };

        setHistory(prev => [...prev, newRequest]);
        
        // Scroll to bottom immediately
        setTimeout(() => {
             if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight
            }
        }, 0)

        const logs = await Info.query_gulp(docIds, ['event.original', '@timestamp', 'agent.type', 'gulp.source_id', 'gulp.context_id'], true)

        await getHint(logs.docs, requestId);
      }

      return (
        <Stack ai="start" jc="center" pos="fixed" dir="column" className={s.wrapper}>
          <Stack ai="center" jc="space-between" dir="row" style={{ width: '100%' }}>
            <Stack gap={8} style={{ fontSize: '18px' }}>
              <Icon name="Robot" size={18} />
              AI Assistant
            </Stack>
            <Stack gap={4}>
              <Button icon="Trash2" variant="tertiary" onClick={() => {
                const confirmed = window.confirm('Are you sure you want to delete all history?');
                if (!confirmed) return;
                setHistory([]);
                if (operation) chatDB.DeleteConfiguration(operation.id);
                toast.info('History deleted'); 
              }} />
              <Button icon="X" variant="tertiary" onClick={onClose} />
            </Stack>
          </Stack>

          <Stack ai="center" jc="start" dir="column" gap={8} className={s.chat} ref={chatRef}>
            {history.map((req) => (
              <Stack key={req.id} id={`request-${req.id}`} dir="column" gap={8} style={{ width: '100%' }}>
                  <Stack className={cn(s.message, s.user)}>
                    {req.userMessage.content}
                  </Stack>
                  <Stack className={cn(s.message, s.ai)}>
                    <Markdown value={req.aiMessage.content} />
                  </Stack>
              </Stack>
            ))}
          </Stack>
          <Stack dir="row" ai="end" gap={8} style={{ width: '100%' }}>
            <Button icon="Search" variant="secondary" onClick={analyze} disabled={loading} style={{ width: '100%' }}>
              Analyze Flagged Events
            </Button>
          </Stack>
        </Stack>
      )
    }
  }
}
