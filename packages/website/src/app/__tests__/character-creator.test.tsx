import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterCreator from "../character-creator";

describe("人物卡创建", () => {
	it("点击创建角色会显示流程弹窗", async () => {
		render(<CharacterCreator />);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "创建角色" }));

		expect(screen.getByText("创建人物卡")).toBeInTheDocument();
	});
});
