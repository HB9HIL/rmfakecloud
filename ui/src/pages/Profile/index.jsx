import Container from "react-bootstrap/Container";
import { useAuthState } from "../../common/useAuthContext";

import ResetPassword from "./ResetPassword";

const Profile = () => {
  const { state: { user } } = useAuthState();
  return (
    <Container className="py-3">
      {user.scopes === "sync15" && (<p>Using sync 15</p>)}
      <div className="col-md-6">
        <ResetPassword />
      </div>
    </Container>
  );
};

export default Profile;
