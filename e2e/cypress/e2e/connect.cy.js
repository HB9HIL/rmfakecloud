describe("connect", () => {
  it("shows a pairing code", () => {
    cy.login();
    cy.visit("/connect");
    cy.get("h1").invoke("text").should("match", /^[a-z]{8}$/);
  });
});
