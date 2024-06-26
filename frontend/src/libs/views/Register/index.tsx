import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { FormEvent, useState } from "react";
import Button from "src/libs/ui/Button";
import Input from "src/libs/ui/Input";
import api from "src/libs/api";

export default function Register() {
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const history = useHistory();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== repeatedPassword)
      return alert("The passwords do not match");

    try {
      await api.registerUser({
        password,
        email,
      });
      history.push("/login");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  return (
    <Container onSubmit={onSubmit}>
      <InnerContainer>
        <Input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
        />
        <Input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
        />
        <Input
          type="password"
          placeholder="Repeat password"
          onChange={(e) => setRepeatedPassword(e.target.value)}
          value={repeatedPassword}
        />
        <Button type="submit">Create user</Button>
      </InnerContainer>
    </Container>
  );
}

const Container = styled.form`
  min-height: calc(100vh - 64px);
  margin: 0;
  display: flex;
`;

const InnerContainer = styled.div`
  margin: auto;
  display: grid;
  grid-auto-flow: row;
  gap: 15px;
  width: 250px;
`;
