def test_execute(temp_dir_shell_environment):
    result = temp_dir_shell_environment.execute("ls -la")
    stdout, rc = result
    assert rc == 0
    assert stdout is not None
    assert stdout != ""

    result = temp_dir_shell_environment.execute("echo 'hello\n'")
    stdout, rc = result
    assert rc == 0
    assert stdout == "hello\n\n"


def test_shared_shell_environment(temp_dir_shell_environment):
    stdout, rc = temp_dir_shell_environment.execute("echo $TESTVAR")
    if stdout.strip():
        stdout, rc = temp_dir_shell_environment.execute("unset TESTVAR")
        assert rc == 0
        assert stdout == "\n"
    stdout, rc = temp_dir_shell_environment.execute("echo $TESTVAR")
    assert rc == 0
    assert stdout == "\n"
    stdout, rc = temp_dir_shell_environment.execute("export TESTVAR='test'")
    assert rc == 0
    assert stdout == ""
    stdout, rc = temp_dir_shell_environment.execute("echo $TESTVAR")
    assert rc == 0
    assert stdout == "test\n"
