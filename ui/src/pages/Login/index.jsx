import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Form } from "react-bootstrap";

import { useAuthState } from "../../common/useAuthContext";
import { loginUser } from "../../common/actions";

import styles from "./Login.module.scss";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [codeError, setCodeError] = useState(null);

  const { state, dispatch } = useAuthState(); //read the values of loading and errorMessage from context
  const { errorMessage, loading } = state;

  const handleLogin = async (e) => {
    e.preventDefault();

    let payload = { email: username, password, code };
    try {
      await loginUser(dispatch, payload);
      navigate("/documents");
    } catch (error) {
      if (error.totp) {
        setCodeError(needCode ? "Invalid code" : null);
        setNeedCode(true);
        setCode("");
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h3 className="mb-4">Log in</h3>
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        {codeError ? <p className={styles.error}>{codeError}</p> : null}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label htmlFor="username">Username</Form.Label>
            <Form.Control
              id="username"
              value={username}
              autoFocus
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading || needCode}
              placeholder="Username" 
              autoComplete="username"
              />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label htmlFor="password">Password</Form.Label>
            <Form.Control
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || needCode}
              placeholder="Password" 
              autoComplete="current-password"
              />
          </Form.Group>

          {needCode && (
            <Form.Group className="mb-3">
              <Form.Label htmlFor="code">Code</Form.Label>
              <Form.Control
                id="code"
                value={code}
                autoFocus
                onChange={(e) => setCode(e.target.value.trim())}
                disabled={loading}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
              />
              <Form.Text>Enter the code from your authenticator app</Form.Text>
            </Form.Group>
          )}

          <Button type="submit" disabled={loading}>
            Login
          </Button>
        </Form>

      </div>
    </div>
  );
};

export default Login;
