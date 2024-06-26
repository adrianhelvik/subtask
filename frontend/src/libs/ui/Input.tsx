import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  ChangeEventHandler,
} from "react";
import styled, { css } from "styled-components";
import * as theme from "../theme";

type Props = {
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  autoFocus?: boolean;
  innerRef?: (element: HTMLInputElement) => void;
  value: string;
  placeholder?: string;
};

export default function Input(props: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [element, setElement] = useState<HTMLInputElement>();

  const type = useMemo(() => {
    if (showPassword) return "text";
    return props.type;
  }, [showPassword, props.type]);

  useEffect(() => {
    if (!props.autoFocus) return;
    console.log("autoFocus");
    if (!element) return;
    element.focus();
  }, [props.autoFocus, element]);

  useEffect(() => {
    if (!showPassword) return;
    const onMouseUp = () => {
      setShowPassword(false);
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [showPassword]);

  const _innerRef = props.innerRef;
  const innerRef = useCallback(
    (element: HTMLInputElement) => {
      if (typeof _innerRef === "function") {
        _innerRef(element);
      }
      setElement(element);
    },
    [_innerRef]
  );

  const show = useCallback(() => {
    setShowPassword(true);
  }, []);

  return (
    <Container>
      <Label>
        <InputField
          onChange={props.onChange}
          value={props.value}
          ref={innerRef}
          type={showPassword ? "text" : type}
          forPassword={props.type === "password"}
          colored={showPassword}
        />
        <LabelText hasContent={Boolean(props.value)}>
          {props.placeholder}
        </LabelText>
      </Label>
      {props.type === "password" && (
        <Icon
          colored={showPassword}
          className="material-icons"
          onMouseDown={show}
        >
          remove_red_eye
        </Icon>
      )}
    </Container>
  );
}

const padding = "7px 5px";
const fontSize = "1rem";

const Container = styled.div`
  position: relative;
  margin-top: 15px;
`;

const InputField = styled.input<{ forPassword: boolean; colored: boolean }>`
  font-size: ${fontSize};
  padding: ${padding};
  border: 1px solid ${theme.gray1};
  box-sizing: border-box;
  border-radius: 4px;
  width: 100%;
  &:focus {
    outline: none;
    border-color: ${theme.ui1};
  }
  &:focus + * {
    transform: translateY(calc(-100% - 7px)) scale(0.7) translateX(-5px);
    color: ${theme.ui1};
  }
  ${(p) =>
    p.forPassword &&
    css`
      padding-right: 30px;
    `}
  ${(p) =>
    p.colored &&
    css`
      border-color: ${theme.ui1};
    `}
`;

const LabelText = styled.div<{ hasContent: boolean }>`
  position: absolute;
  font-size: ${fontSize};
  padding: ${padding};
  pointer-events: none;
  color: ${theme.gray1};
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  transform-origin: 0 0;
  transition: 0.3s;
  ${(props) =>
    props.hasContent &&
    css`
      transform: translateY(calc(-100% - 7px)) scale(0.7) translateX(-5px);
    `}
  :-webkit-autofill + & {
    transform: translateY(calc(-100% - 7px)) scale(0.7) translateX(-5px);
  }
`;

const Label = styled.label``;

const Icon = styled.i<{ colored: boolean }>`
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  ${(p) =>
    p.colored &&
    css`
      color: ${theme.ui1};
    `}
`;
