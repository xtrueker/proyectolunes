import Icon from "./Icon";
import { STATUS_META } from "../utils/constants";

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status];

  return (
    <span className={`badge badge-${meta?.tone || "cancelled"}`}>
      <Icon name={meta?.icon || "info"} size={14} />
      {meta?.label || status}
    </span>
  );
}
