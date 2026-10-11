import React from "react";
import { Nav, Navbar, Button, NavDropdown, Container } from "react-bootstrap";
import { logout } from "../common/actions";
import { useAuthState } from "../common/useAuthContext";
import { NavLink } from "react-router";

const NavigationBar = () => {
  const { state:{user}, dispatch } = useAuthState();
  function handleLogout(e) {
    logout(dispatch);
  }

  function isAdmin() {
    return user && user.Roles && user.Roles[0] === "Admin";
  }
  return (
    <Navbar expand="md" collapseOnSelect>
      <Container fluid>
        <Navbar.Brand as={NavLink} to="/">
          rmfakecloud
        </Navbar.Brand>
        {user && (
          <>
            <Navbar.Toggle />
            <Navbar.Collapse>
              <Nav>
                <Nav.Link as={NavLink} to="/documents" eventKey="/documents">
                  Documents
                </Nav.Link>
                <Nav.Link as={NavLink} to="/integrations" eventKey="/integrations">
                  Integrations
                </Nav.Link>
                <Nav.Link as={NavLink} to="/connect" eventKey="/connect">
                  Connect
                </Nav.Link>
                <Nav.Link as={NavLink} to="/screenshare" eventKey="/screenshare">
                  Screen Share
                </Nav.Link>
                {isAdmin() && (
                  <Nav.Link as={NavLink} to="/admin" eventKey="/admin">
                    Admin
                  </Nav.Link>
                )}
              </Nav>
              <Nav className="ms-auto">
                <NavDropdown id="userMenu" title={user.UserID} align="end">
                  <NavDropdown.Item as={NavLink} to="/profile" eventKey="/profile">Profile</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item as={Button} eventKey="logout" onClick={handleLogout}>Log out</NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
