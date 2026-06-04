import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Application } from '../context/Application.context'
import { Operation } from '../entities/Operation'
import { Source } from '../entities/Source'
import { MainDashboard } from './MainDashboard'
import { SelectFiles } from '../banners/SelectFiles.banner'

/**
 * OperationView component handles routing and initialization logic for a specific operation.
 * It checks if a saved session exists or if one was already loaded manually.
 * If no session is active, it opens the SelectFiles banner to configure contexts and sources.
 *
 * @returns React component or loading state
 */
export function OperationView() {
  const { operation_id } = useParams<{ operation_id: string }>()
  const navigate = useNavigate()
  const { app, Info, spawnBanner } = Application.use()
  const [initialized, setInitialized] = useState(false)

  // Sync route param with global selection state when operation is swapped in UI
  const selectedOpId = Operation.Entity.selected(app)?.id;

  useEffect(() => {
    if (selectedOpId && selectedOpId !== operation_id) {
      navigate(`/operations/${selectedOpId}`);
    }
  }, [selectedOpId, operation_id, navigate]);

  useEffect(() => {
    if (!operation_id) return

    /**
     * Internal async function to check for active sessions and configure selection banner.
     */
    const initializeOperation = async () => {
      // 0. If operations are not loaded yet (e.g. page refreshed), fetch them from backend
      if (app.target.operations.length === 0) {
        const savedUserId = localStorage.getItem("__user_id");
        if (savedUserId && !app.general.user) {
          try {
            const userProfile = await Info.user_get_by_id(savedUserId);
            if (userProfile) {
              Info.setInfoByKey(userProfile, "general", "user");
            }
          } catch (e) {
            // API error handler in API.tsx handles redirection to /login on 401
            return;
          }
        }

        await Info.plugin_list();
        await Info.glyphs_reload();
        await Info.sync();
      }

      // 1. Ensure the operation is selected in the global state
      const currentOp = Operation.Entity.selected(app)
      const isNewOperation = !currentOp || currentOp.id !== operation_id;
      if (isNewOperation) {
        Info.operations_select(operation_id as Operation.Id)
      }

      // 2. Check if a session was manually loaded or timeline was skipped
      const hasSelectedFiles = Source.Entity.selected(app).length > 0
      if ((!isNewOperation && hasSelectedFiles) || app.general.skippedAuth) {
        if (app.general.skippedAuth) {
          Info.setInfoByKey(false, "general", "skippedAuth");
        }
        setInitialized(true)
        return
      }

      // 3. Present the SelectFiles banner to let user pick files/contexts or load a session
      spawnBanner(<SelectFiles.Banner fixed />)
      setInitialized(true)
    }

    initializeOperation()
  }, [operation_id])

  if (!initialized) {
    return null
  }

  return <MainDashboard />
}
