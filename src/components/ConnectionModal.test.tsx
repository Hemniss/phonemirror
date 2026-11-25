import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConnectionModal from "./ConnectionModal";
import { connectWireless, pairDevice } from "../lib/tauri";

vi.mock("../lib/tauri", () => ({
  connectWireless: vi.fn(),
  pairDevice: vi.fn(),
}));

const mockConnect = vi.mocked(connectWireless);
const mockPair = vi.mocked(pairDevice);

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("ConnectionModal : bornes de saisie", () => {
  beforeEach(() => {
    mockConnect.mockReset().mockResolvedValue("192.168.1.20:5555");
    mockPair.mockReset().mockResolvedValue();
  });

  it("port hors bornes : erreur affichée, bouton désactivé, rien envoyé", () => {
    render(<ConnectionModal onClose={() => {}} />);
    type("Adresse IP", "192.168.1.20");
    for (const bad of ["0", "70000", "12abc", ""]) {
      type("Port", bad);
      expect(screen.getByText(/Port invalide/)).toBeTruthy();
      const btn = screen.getByRole("button", { name: "Connecter" });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(btn);
    }
    fireEvent.keyDown(screen.getByLabelText("Adresse IP"), { key: "Enter" });
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("port valide : envoie l'entier", () => {
    render(<ConnectionModal onClose={() => {}} />);
    type("Adresse IP", "192.168.1.20");
    type("Port", "5556");
    fireEvent.click(screen.getByRole("button", { name: "Connecter" }));
    expect(mockConnect).toHaveBeenCalledWith("192.168.1.20", 5556);
  });

  it("appairage : port et code exigés", () => {
    render(<ConnectionModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: /Appairage/ }));
    type("IP d'appairage", "192.168.1.20");
    type("Port", "99999");
    type("Code de couplage (6 chiffres)", "12a");
    const btn = screen.getByRole("button", { name: "Appairer" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    type("Port", "37000");
    type("Code de couplage (6 chiffres)", "123456");
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(mockPair).toHaveBeenCalledWith("192.168.1.20", 37000, "123456");
  });
});
