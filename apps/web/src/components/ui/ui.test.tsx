import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Field, Input, StatCard } from "./index.js";

describe("ui primitives", () => {
  it("Button fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("Field shows an error message", () => {
    render(
      <Field label="Email" error="Required">
        <Input />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
  it("Field shows a hint, and hides it once an error is present", () => {
    const { rerender } = render(
      <Field label="Password" hint="At least 8 characters">
        <Input />
      </Field>,
    );
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    rerender(
      <Field label="Password" hint="At least 8 characters" error="Too short">
        <Input />
      </Field>,
    );
    expect(screen.queryByText("At least 8 characters")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Too short");
  });
  it("StatCard shows label and value", () => {
    render(<StatCard label="Users" value={42} />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
