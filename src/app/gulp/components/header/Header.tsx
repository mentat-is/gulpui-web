import { DataTransfered } from "./DataTransfered";
import { DateLimit } from "./DateLimit";
import { Logout } from "./Logout";

export function Header() {
  return (
    <header>
      <DataTransfered />
      <DateLimit />
      <Logout />
    </header>
  )
}
