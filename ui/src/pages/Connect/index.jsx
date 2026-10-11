import React, {useState, useLayoutEffect} from "react";
import apiservice from "../../services/api.service"
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { FaRepeat } from "react-icons/fa6";

export default function CodeGenerator() {

  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  const newCode = async () => {
    setCode("")
    const code = await apiservice.getCode()
      .catch(e => {
        setError(e)
      })
    setCode(code)
  }

  useLayoutEffect(() => {
    newCode()
  }, [])

  if (error) {
    return <Container className="py-3">{error.message}</Container>;
  }

  return (
    <Container className="py-3 text-center">
      <h3>Connect a device</h3>
      <p>Enter this one-time code on your reMarkable.</p>
      <h1 className="font-monospace text-break my-5" style={{ letterSpacing: "10px" }}>{code}</h1>
      <Button onClick={newCode} title="New code">
        <FaRepeat />
      </Button>
    </Container>
  );
}
