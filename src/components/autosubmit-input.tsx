"use client";

export function AutoSubmitInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      onBlur={(e) => {
        const form = e.currentTarget.form;
        if (form) (form as HTMLFormElement).requestSubmit();
      }}
    />
  );
}
