git clone <URL_DO_REPO>
cd <PASTA_DO_REPO>

git checkout --orphan clean
git rm -r --cached .
git commit --allow-empty -m "Repo limpo"
git push -f origin clean:main
