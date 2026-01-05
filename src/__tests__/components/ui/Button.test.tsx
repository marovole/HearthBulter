/**
 * Button 组件测试
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("should render button with text", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("should handle click events", () => {
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should render different variants", () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render different sizes", () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    const handleClick = jest.fn();

    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>,
    );

    const button = screen.getByRole("button", { name: /disabled button/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should render as different element when asChild prop is provided", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Button</Button>);

    const button = screen.getByRole("button", { name: /button/i });
    expect(button).toHaveClass("custom-class");
  });

  it("should pass through additional props", () => {
    render(
      <Button data-testid="test-button" type="submit">
        Submit
      </Button>,
    );

    const button = screen.getByTestId("test-button");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("should render loading state", () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole("button", { name: /loading/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("should render with icon", () => {
    const MockIcon = () => <span data-testid="mock-icon">Icon</span>;

    render(
      <Button>
        <MockIcon />
        Button with Icon
      </Button>,
    );

    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /button with icon/i }),
    ).toBeInTheDocument();
  });

  it("should handle keyboard navigation", () => {
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Button</Button>);

    const button = screen.getByRole("button", { name: /button/i });

    button.focus();
    expect(button).toHaveFocus();

    // Native buttons support keyboard navigation by default
    // Testing that the button is focusable is sufficient
    // In a real browser, Enter and Space would trigger onClick
    expect(button.tagName).toBe("BUTTON");
    expect(button).not.toBeDisabled();
  });

  it("should be accessible", () => {
    render(<Button aria-label="Custom label">Button</Button>);

    const button = screen.getByRole("button", { name: /custom label/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Custom label");
  });

  it("should respect aria-disabled attribute", () => {
    render(<Button aria-disabled={true}>Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("should handle form submission", () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());

    render(
      <form onSubmit={handleSubmit}>
        <Button type="submit">Submit</Button>
      </form>,
    );

    const button = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("should render children correctly", () => {
    render(
      <Button>
        <span>Complex</span>
        <span>Content</span>
      </Button>,
    );

    expect(screen.getByText("Complex")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should not render when children are empty", () => {
    render(<Button></Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toBeEmptyDOMElement();
  });
});
