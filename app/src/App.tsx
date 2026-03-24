import { AppShell } from "./app/AppShell";
import { useAppController } from "./app/useAppController";

export default function App() {
  const { state, dispatch, handleSubmitMessage } = useAppController();

  return <AppShell state={state} dispatch={dispatch} onSubmitMessage={handleSubmitMessage} />;
}
