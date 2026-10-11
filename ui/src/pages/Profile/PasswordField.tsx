import { useId, useState, type ComponentProps } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { inputClass } from "../../components/styles";

export default function PasswordField({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className={`${inputClass} pr-10`} {...props} />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted hover:text-ink"
          onClick={() => setShow(!show)}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
}
