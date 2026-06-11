local project_root = vim.fn.getcwd()

vim.keymap.set("n", "<leader>Ls", function()
	vim.cmd("split | terminal live-server --port=8080 --browser=chrome")
	vim.notify("Live server started at http://localhost:8080", vim.log.levels.INFO)
end, { desc = "[L]ive [S]erver start" })

vim.keymap.set("n", "<leader>Lk", function()
	for _, buf in ipairs(vim.api.nvim_list_bufs()) do
		if vim.bo[buf].buftype == "terminal" then
			local chan = vim.bo[buf].channel
			vim.api.nvim_chan_send(chan, "\x03")
			vim.cmd("bdelete! " .. buf)
		end
	end
	vim.notify("Live server stopped", vim.log.levels.INFO)
end, { desc = "[L]ive server [K]ill" })

vim.keymap.set("n", "<leader>Lo", function()
	vim.cmd("!start http://localhost:8080")
end, { desc = "[L]ive server [O]pen browser" })

vim.keymap.set("n", "<leader>Lw", function()
	vim.cmd("split | terminal tsc --watch")
end, { desc = "[T]ypeScript [W]atch" })

